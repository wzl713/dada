import { supabase } from '../supabaseClient'

export async function getReviewSummary(userId) {
  const { data, error } = await supabase
    .from('activity_reviews')
    .select('rating, tags')
    .eq('reviewee_id', userId)

  if (error || !data) {
    return {
      averageRating: 0,
      reviewCount: 0,
      topTags: [],
      positiveRate: 0,
    }
  }

  const reviewCount = data.length
  if (!reviewCount) {
    return {
      averageRating: 0,
      reviewCount: 0,
      topTags: [],
      positiveRate: 0,
    }
  }

  const totalRating = data.reduce((sum, item) => sum + Number(item.rating || 0), 0)
  const tagMap = new Map()
  let positiveCount = 0

  data.forEach((item) => {
    if (Number(item.rating) >= 4) positiveCount += 1
    ;(item.tags || []).forEach((tag) => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
    })
  })

  const topTags = Array.from(tagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag)

  return {
    averageRating: Number((totalRating / reviewCount).toFixed(1)),
    reviewCount,
    topTags,
    positiveRate: Math.round((positiveCount / reviewCount) * 100),
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export async function getReliabilitySummary(userId) {
  const [reviewSummary, memberResult, reportResult, creditResult] = await Promise.all([
    getReviewSummary(userId),
    supabase
      .from('activity_members')
      .select('status, departure_confirmed_at, no_show_marked_at, activities(start_time)')
      .eq('user_id', userId),
    supabase.rpc('get_user_report_count', { p_user_id: userId }),
    supabase.rpc('calculate_user_credit', { p_user_id: userId }),
  ])

  const memberRows = memberResult.data || []
  const reportCount = reportResult.data || 0
  const credit = creditResult.data?.[0] || getFallbackCredit(memberRows)
  const now = new Date()
  const approvedRows = memberRows.filter((item) => item.status === 'approved')
  const dueRows = approvedRows.filter((item) => {
    const startTime = item.activities?.start_time
    return startTime && new Date(startTime) <= now
  })
  const confirmedRows = dueRows.filter((item) => item.departure_confirmed_at && !item.no_show_marked_at)
  const punctualRate = dueRows.length ? Math.round((confirmedRows.length / dueRows.length) * 100) : 0

  const reviewBase = reviewSummary.reviewCount ? reviewSummary.averageRating : 4
  const attendanceBonus = dueRows.length ? (punctualRate - 80) / 100 : 0
  const reportPenalty = Math.min(reportCount * 0.25, 1.5)
  const reliabilityScore = Number(clamp(reviewBase + attendanceBonus - reportPenalty, 1, 5).toFixed(1))

  return {
    ...reviewSummary,
    reliabilityScore,
    punctualRate,
    punctualSampleCount: dueRows.length,
    participatedCount: approvedRows.length,
    reportCount,
    creditScore: credit.credit_score,
    creditLevelKey: credit.level_key,
    creditLevelLabel: credit.level_label,
    completedCount: credit.completed_count,
    missedConfirmCount: credit.missed_confirm_count,
    noShowCount: credit.no_show_count,
    hostedCount: credit.hosted_count,
    activeApplicationCount: credit.active_application_count,
    canCreateActivity: credit.can_create_activity,
  }
}

export async function getCreditSummary(userId) {
  const { data } = await supabase.rpc('calculate_user_credit', { p_user_id: userId })
  return data?.[0] || getFallbackCredit([])
}

function getFallbackCredit(memberRows) {
  const now = new Date()
  const completedCount = memberRows.filter((item) => (
    item.status === 'approved'
    && item.departure_confirmed_at
    && !item.no_show_marked_at
    && item.activities?.start_time
    && new Date(item.activities.start_time) <= now
  )).length

  return {
    credit_score: completedCount,
    completed_count: completedCount,
    missed_confirm_count: 0,
    no_show_count: 0,
    hosted_count: 0,
    active_application_count: 0,
    level_key: completedCount <= 2 ? 'newbie' : 'regular',
    level_label: completedCount <= 2 ? '新人' : '普通用户',
    can_create_activity: true,
  }
}

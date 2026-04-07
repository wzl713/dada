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
  const [reviewSummary, memberResult, reportResult] = await Promise.all([
    getReviewSummary(userId),
    supabase
      .from('activity_members')
      .select('status, departure_confirmed_at, activities(start_time)')
      .eq('user_id', userId),
    supabase.rpc('get_user_report_count', { p_user_id: userId }),
  ])

  const memberRows = memberResult.data || []
  const reportCount = reportResult.data || 0
  const now = new Date()
  const approvedRows = memberRows.filter((item) => item.status === 'approved')
  const dueRows = approvedRows.filter((item) => {
    const startTime = item.activities?.start_time
    return startTime && new Date(startTime) <= now
  })
  const confirmedRows = dueRows.filter((item) => item.departure_confirmed_at)
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
  }
}

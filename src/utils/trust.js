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

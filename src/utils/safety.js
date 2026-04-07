import { supabase } from '../supabaseClient'

export async function getBlockedUserIds(userId) {
  const { data } = await supabase
    .from('blocked_users')
    .select('blocker_id, blocked_user_id')
    .or(`blocker_id.eq.${userId},blocked_user_id.eq.${userId}`)

  return (data || []).map((item) => (
    item.blocker_id === userId ? item.blocked_user_id : item.blocker_id
  ))
}

export async function getBlockRelationship(currentUserId, otherUserId) {
  const { data } = await supabase
    .from('blocked_users')
    .select('blocker_id, blocked_user_id')
    .or(
      `and(blocker_id.eq.${currentUserId},blocked_user_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_user_id.eq.${currentUserId})`
    )

  const rows = data || []
  return {
    blockedByMe: rows.some(
      (item) => item.blocker_id === currentUserId && item.blocked_user_id === otherUserId
    ),
    blockedMe: rows.some(
      (item) => item.blocker_id === otherUserId && item.blocked_user_id === currentUserId
    ),
  }
}

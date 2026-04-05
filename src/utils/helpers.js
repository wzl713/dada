// 相对时间（刚刚/x分钟前/x小时前/x天前）
export function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 格式化时间显示
export function formatTime(t) {
  const d = new Date(t)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()

  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')

  const timeStr = `${hour}:${min}`

  if (isToday) return `今天 ${timeStr}`

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return `明天 ${timeStr}`

  return `${month}月${day}日 ${timeStr}`
}

// 格式化简短时间
export function formatShortTime(t) {
  const d = new Date(t)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// 获取用户信息（昵称 + 头像）
import { supabase } from '../supabaseClient'

export async function getUserInfo(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('nickname, avatar_url')
    .eq('id', userId)
    .single()
  return {
    nickname: data?.nickname || ('用户' + userId.slice(0, 6)),
    avatar_url: data?.avatar_url || '',
  }
}

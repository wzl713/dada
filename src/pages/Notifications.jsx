import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import Navbar from '../components/Navbar'
import { SkeletonMessages } from '../components/Skeleton'
import { timeAgo, getUserInfo } from '../utils/helpers'
import Avatar from '../components/Avatar'

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [userInfos, setUserInfos] = useState({})

  useEffect(() => {
    let active = true

    async function loadNotifications() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!active) return
      setNotifications(data || [])

      const ids = [...new Set((data || []).filter((item) => item.from_user_id).map((item) => item.from_user_id))]
      const infos = {}
      for (const id of ids) {
        infos[id] = await getUserInfo(id)
      }

      if (!active) return
      setUserInfos(infos)
      setLoading(false)
    }

    loadNotifications()
    return () => {
      active = false
    }
  }, [user.id])

  async function handleRead(notification) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id)
    setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)))
    if (notification.activity_id) navigate(`/activity/${notification.activity_id}`)
    else if (notification.from_user_id) navigate(`/user/${notification.from_user_id}`)
  }

  async function handleReadAll() {
    const unread = notifications.filter((item) => !item.is_read)
    if (unread.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unread.map((item) => item.id))
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })))
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length

  function getIcon(type) {
    switch (type) {
      case 'join_activity':
        return '🆕'
      case 'friend_request':
        return '👋'
      case 'friend_accepted':
        return '🎉'
      case 'new_comment':
        return '💬'
      default:
        return '🔔'
    }
  }

  if (loading) {
    return (
      <div>
        <Navbar title="通知" showBack />
        <SkeletonMessages />
      </div>
    )
  }

  return (
    <div>
      <Navbar title="通知" showBack />
      <div className="container" style={{ paddingTop: 12, paddingBottom: 90 }}>
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">暂无通知</div>
            <div className="empty-state-desc">有人加入、评论或与你互动时，会在这里提醒你。</div>
          </div>
        ) : (
          <>
            {unreadCount > 0 && (
              <div style={{ padding: '8px 4px', textAlign: 'right', marginBottom: 4 }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }} onClick={handleReadAll}>
                  全部标为已读
                </button>
              </div>
            )}
            {notifications.map((notification) => {
              const fromInfo = userInfos[notification.from_user_id]
              return (
                <div
                  key={notification.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 14,
                    marginBottom: 2,
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: notification.is_read ? 'transparent' : '#f8f7ff',
                  }}
                  onClick={() => handleRead(notification)}
                >
                  <div style={{ flexShrink: 0 }}>
                    {fromInfo ? (
                      <Avatar src={fromInfo.avatar_url} nickname={fromInfo.nickname} size={40} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {getIcon(notification.type)}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: notification.is_read ? 400 : 600, fontSize: 14 }}>{notification.title}</span>
                      {!notification.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginLeft: 8 }} />}
                    </div>
                    {notification.content && (
                      <div style={{ fontSize: 13, color: '#999', lineHeight: 1.4, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {notification.content}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#ccc' }}>{timeAgo(notification.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

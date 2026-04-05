import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import Navbar from '../components/Navbar'
import { SkeletonMessages } from '../components/Skeleton'
import { timeAgo } from '../utils/helpers'
import Avatar from '../components/Avatar'
import { getUserInfo } from '../utils/helpers'

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [userInfos, setUserInfos] = useState({})

  useEffect(() => { fetchNotifications() }, [])

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    setNotifications(data || [])

    // 预加载用户信息
    if (data) {
      const infos = {}
      const userIds = [...new Set(data.filter(n => n.from_user_id).map(n => n.from_user_id))]
      for (const uid of userIds) {
        infos[uid] = await getUserInfo(uid)
      }
      setUserInfos(infos)
    }
    setLoading(false)
  }

  const handleRead = async (n) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
    if (n.activity_id) navigate(`/activity/${n.activity_id}`)
    else if (n.from_user_id) navigate(`/user/${n.from_user_id}`)
  }

  const handleReadAll = async () => {
    const unread = notifications.filter(n => !n.is_read)
    if (unread.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unread.map(n => n.id))
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const getIcon = (type) => {
    switch (type) {
      case 'join_activity': return '🆕'
      case 'friend_request': return '👋'
      case 'friend_accepted': return '🎉'
      case 'new_message': return '💬'
      case 'new_comment': return '💬'
      default: return '🔔'
    }
  }

  if (loading) return <div><Navbar title="通知" showBack /><SkeletonMessages /></div>

  return (
    <div>
      <Navbar title="通知" showBack />
      <div className="container" style={{ paddingTop: 12, paddingBottom: 90 }}>
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">暂无通知</div>
            <div className="empty-state-desc">有新消息时会在这里提醒你</div>
          </div>
        ) : (
          <>
            {unreadCount > 0 && (
              <div style={{ padding: '8px 4', textAlign: 'right', marginBottom: 4 }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }} onClick={handleReadAll}>
                  全部标为已读
                </button>
              </div>
            )}
            {notifications.map(n => {
              const fromInfo = userInfos[n.from_user_id]
              return (
                <div key={n.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: 14, marginBottom: 2, borderRadius: 12, cursor: 'pointer',
                    background: n.is_read ? 'transparent' : '#f8f7ff',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => handleRead(n)}
                >
                  <div style={{ flexShrink: 0 }}>
                    {fromInfo ? (
                      <Avatar src={fromInfo.avatar_url} nickname={fromInfo.nickname} size={40} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{getIcon(n.type)}</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: n.is_read ? 400 : 600, fontSize: 14 }}>{n.title}</span>
                      {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginLeft: 8 }} />}
                    </div>
                    {n.content && <div style={{ fontSize: 13, color: '#999', lineHeight: 1.4, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</div>}
                    <div style={{ fontSize: 11, color: '#ccc' }}>{timeAgo(n.created_at)}</div>
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

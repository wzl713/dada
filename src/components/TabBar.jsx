import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function TabBar() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    if (!user) return
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadNotifications(count || 0)
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [user])

  const tabs = [
    { path: '/', icon: '🏠', label: '首页' },
    { path: '/notifications', icon: '🔔', label: '通知', badge: unreadNotifications },
    { path: '/create', icon: '➕', label: '发布', isCenter: true },
    { path: '/messages', icon: '💬', label: '消息' },
    { path: '/profile', icon: '👤', label: '我的' },
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/activity')
    return location.pathname.startsWith(path)
  }

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        tab.isCenter ? (
          <button
            key={tab.path}
            className="tab-bar-item"
            onClick={() => navigate(tab.path)}
            style={{ position: 'relative', marginTop: -12 }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            }}>
              <span style={{ fontSize: 22, color: '#fff' }}>{tab.icon}</span>
            </div>
            <span style={{ fontSize: 10, marginTop: 2, color: '#888' }}>{tab.label}</span>
          </button>
        ) : (
          <button
            key={tab.path}
            className={`tab-bar-item${isActive(tab.path) ? ' active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className="tab-bar-icon">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span className="tab-bar-badge">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        )
      ))}
    </div>
  )
}

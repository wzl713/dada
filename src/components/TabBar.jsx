import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { DuckMascot, LineIcon } from './DadaIcons'

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
    { path: '/', icon: 'home', label: '首页' },
    { path: '/notifications', icon: 'bell', label: '通知', badge: unreadNotifications },
    { path: '/create', icon: 'plus', label: '发布', isCenter: true },
    { path: '/profile', icon: 'user', label: '我的' },
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
              background: 'linear-gradient(135deg, #ffe8a3 0%, #ffd1dc 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 14px rgba(245, 177, 66, 0.28)',
              color: '#5b4630',
            }}>
              <DuckMascot size={30} mood="happy" />
            </div>
            <span style={{ fontSize: 10, marginTop: 2, color: '#888' }}>{tab.label}</span>
          </button>
        ) : (
          <button
            key={tab.path}
            className={`tab-bar-item${isActive(tab.path) ? ' active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className="tab-bar-icon"><LineIcon name={tab.icon} size={22} /></span>
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

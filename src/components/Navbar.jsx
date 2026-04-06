import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Navbar({ title = '搭搭', showBack = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (!user) return
    const fetchAvatar = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()
      setAvatarUrl(data?.avatar_url || '')
    }
    fetchAvatar()
  }, [user])

  const initial = user?.email?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {showBack && (
          <button
            className="navbar-icon-btn"
            onClick={() => navigate(-1)}
            style={{ background: 'none' }}
          >
            ←
          </button>
        )}
        <span className="navbar-title">{title}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          className="navbar-avatar"
          onClick={() => navigate('/profile')}
          title="我的"
          style={avatarUrl ? {
            background: `url(${avatarUrl}) center/cover no-repeat`,
          } : undefined}
        >
          {!avatarUrl && initial}
        </button>
      </div>
    </div>
  )
}

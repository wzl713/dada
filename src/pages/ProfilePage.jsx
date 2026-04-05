import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import Navbar from '../components/Navbar'
import { uploadImage, compressImage } from '../utils/upload'
import { SkeletonProfile } from '../components/Skeleton'
import { formatShortTime } from '../utils/helpers'
import { useToast } from '../components/Toast'

export default function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [profile, setProfile] = useState({ nickname: '', email: '', avatar_url: '', points: 0, reputation: 100 })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [tab, setTab] = useState('published')
  const [myActivities, setMyActivities] = useState([])
  const [joinedActivities, setJoinedActivities] = useState([])
  const avatarInputRef = useRef(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('nickname, avatar_url, points, reputation').eq('id', user.id).single()
      const name = data?.nickname || user.email?.split('@')[0] || '用户'
      setProfile({ nickname: name, email: user.email, avatar_url: data?.avatar_url || '', points: data?.points || 0, reputation: data?.reputation || 100 })
      setNickname(name)
      setLoading(false)
    }
    fetchProfile()
  }, [user])

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('to_user_id', user.id).eq('status', 'pending')
      setPendingCount(count || 0)
    }
    fetchPending()
  }, [user])

  useEffect(() => {
    const fetchActivities = async () => {
      const { data: published } = await supabase.from('activities').select('id, title, start_time, location, max_members, created_at').eq('creator_id', user.id).order('start_time', { ascending: false })
      setMyActivities(published || [])
      const { data: joined } = await supabase.from('activity_members').select('activity_id, joined_at').eq('user_id', user.id)
      if (joined && joined.length > 0) {
        const joinedIds = joined.map(j => j.activity_id)
        const { data: acts } = await supabase.from('activities').select('id, title, start_time, location, max_members, creator_id, created_at').in('id', joinedIds).neq('creator_id', user.id).order('start_time', { ascending: false })
        setJoinedActivities(acts || [])
      }
    }
    fetchActivities()
  }, [user])

  const handleSave = async () => {
    if (!nickname.trim()) return
    const { error } = await supabase.from('profiles').upsert({ id: user.id, nickname: nickname.trim() })
    if (error) toast.error('保存失败')
    else { setProfile({ ...profile, nickname: nickname.trim() }); setEditing(false); toast.success('已保存') }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file, 400, 0.8)
    const url = await uploadImage(compressed, 'avatars', user.id)
    if (url) {
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setProfile({ ...profile, avatar_url: url })
      toast.success('头像已更新')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return <div><Navbar title="我的" /><SkeletonProfile /></div>

  const displayActivities = tab === 'published' ? myActivities : joinedActivities

  return (
    <div>
      <Navbar title="我的" />

      <div className="container" style={{ paddingTop: 12, paddingBottom: 90 }}>
        {/* 用户卡片 */}
        <div className="card" style={{ textAlign: 'center', padding: 28, marginBottom: 16 }}>
          <div
            onClick={() => avatarInputRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover no-repeat` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, margin: '0 auto 14px', cursor: 'pointer',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
            }}
          >
            {!profile.avatar_url && profile.nickname.charAt(0).toUpperCase()}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, padding: '2px 0', textAlign: 'center' }}>更换</div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={handleAvatarUpload} />

          {editing ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <input className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="输入昵称" style={{ width: 160, textAlign: 'center' }} autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} />
              <button className="btn-accent" style={{ padding: '8px 16px' }} onClick={handleSave}>保存</button>
              <button className="btn-ghost" style={{ padding: '8px 12px' }} onClick={() => setEditing(false)}>取消</button>
            </div>
          ) : (
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{profile.nickname}</h2>
          )}

          <p style={{ fontSize: 13, color: '#bbb', marginBottom: 6 }}>{profile.email}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{profile.points}</div>
              <div style={{ fontSize: 11, color: '#ccc' }}>积分</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: profile.reputation >= 150 ? '#22c55e' : '#f59e0b' }}>{profile.reputation}</div>
              <div style={{ fontSize: 11, color: '#ccc' }}>信誉</div>
            </div>
          </div>
          {!editing && (
            <button className="btn-ghost" onClick={() => setEditing(true)}>✏️ 修改昵称</button>
          )}
        </div>

        {/* 功能列表 */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {[
            { icon: '🔔', label: '通知', path: '/notifications', badge: null },
            { icon: '💬', label: '私信', path: '/messages', badge: null },
            { icon: '👥', label: '好友管理', path: '/profile/friends', badge: pendingCount },
            { icon: '📝', label: '发布活动', path: '/create', badge: null },
          ].map(item => (
            <div key={item.path} className="profile-menu-item" onClick={() => navigate(item.path)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge > 0 && <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 11, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>{item.badge}</span>}
              </span>
              <span style={{ color: '#ddd' }}>›</span>
            </div>
          ))}
        </div>

        {/* 活动 Tab */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
            {[{ key: 'published', label: '我发布的', count: myActivities.length }, { key: 'joined', label: '我加入的', count: joinedActivities.length }].map(t => (
              <div key={t.key} style={{
                flex: 1, padding: '14px 0', textAlign: 'center', fontSize: 14, fontWeight: 600,
                color: tab === t.key ? '#1a1a1a' : '#bbb',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }} onClick={() => setTab(t.key)}>
                {t.label} <span style={{ fontSize: 12, color: '#bbb' }}>{t.count}</span>
              </div>
            ))}
          </div>
          {displayActivities.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-icon" style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div className="empty-state-desc">{tab === 'published' ? '还没有发布活动' : '还没有加入活动'}</div>
            </div>
          ) : (
            displayActivities.map(a => {
              const expired = new Date(a.start_time) < new Date()
              return (
                <div key={a.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }} onClick={() => navigate(`/activity/${a.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{a.title}</span>
                    {expired && <span className="tag tag-danger" style={{ fontSize: 11, flexShrink: 0, marginLeft: 8 }}>已结束</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#bbb' }}>
                    🕐 {formatShortTime(a.start_time)} · 📍 {a.location}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <button className="btn-outline" style={{ marginTop: 16, borderColor: '#fecaca', color: '#ef4444' }} onClick={handleLogout}>
          退出登录
        </button>
      </div>
    </div>
  )
}

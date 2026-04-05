import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'
import { SkeletonProfile } from '../components/Skeleton'
import { formatShortTime } from '../utils/helpers'
import { useToast } from '../components/Toast'

export default function UserProfile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [profile, setProfile] = useState(null)
  const [activities, setActivities] = useState([])
  const [friendStatus, setFriendStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const isSelf = user?.id === userId

  useEffect(() => {
    if (isSelf) { navigate('/profile'); return }
    fetchUserData()
  }, [userId])

  const fetchUserData = async () => {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('id, nickname, avatar_url, created_at, points, reputation').eq('id', userId).single()
    let nickname = prof?.nickname || ('用户' + userId.slice(0, 6))
    setProfile({
      id: userId, nickname,
      avatar_url: prof?.avatar_url || '',
      points: prof?.points || 0,
      reputation: prof?.reputation || 100,
    })

    const { data: acts } = await supabase.from('activities').select('id, title, start_time, location, max_members, created_at, cover_url').eq('creator_id', userId).order('created_at', { ascending: false })
    setActivities(acts || [])
    checkFriendship()
    setLoading(false)
  }

  const checkFriendship = async () => {
    const { data } = await supabase.from('friendships').select('id, status, from_user_id, to_user_id').eq('from_user_id', user.id).eq('to_user_id', userId).neq('status', 'rejected').single()
    const { data: reverse } = !data ? await supabase.from('friendships').select('id, status, from_user_id, to_user_id').eq('from_user_id', userId).eq('to_user_id', user.id).neq('status', 'rejected').single() : {}
    const rel = data || reverse
    if (rel) {
      setFriendStatus(rel.status === 'pending' && rel.from_user_id === userId ? 'received' : rel.status)
    } else {
      setFriendStatus('none')
    }
  }

  const handleAddFriend = async () => {
    const { error } = await supabase.from('friendships').insert({ from_user_id: user.id, to_user_id: userId, status: 'pending' })
    if (error) toast.error(error.code === '23505' ? '已申请过' : '操作失败')
    else setFriendStatus('pending')
  }

  const handleAcceptFriend = async () => {
    const { error } = await supabase.from('friendships').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('from_user_id', userId).eq('to_user_id', user.id).eq('status', 'pending')
    if (!error) setFriendStatus('accepted')
  }

  const handleRejectFriend = async () => {
    const { error } = await supabase.from('friendships').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('from_user_id', userId).eq('to_user_id', user.id).eq('status', 'pending')
    if (!error) setFriendStatus('none')
  }

  if (loading) return <div><Navbar title="用户主页" showBack /><SkeletonProfile /></div>
  if (!profile) return <div><Navbar title="用户主页" showBack /><div className="empty-state"><div className="empty-state-icon">🤷</div><div className="empty-state-title">用户不存在</div></div></div>

  const getReputationLabel = (rep) => {
    if (rep >= 200) return { text: '信誉极佳', color: '#22c55e', bg: '#f0fdf4' }
    if (rep >= 150) return { text: '信誉良好', color: '#667eea', bg: '#f0edff' }
    if (rep >= 100) return { text: '信誉一般', color: '#f59e0b', bg: '#fffbeb' }
    return { text: '信誉较低', color: '#ef4444', bg: '#fef2f2' }
  }
  const repInfo = getReputationLabel(profile.reputation)

  return (
    <div>
      <Navbar title="用户主页" showBack />

      <div className="container" style={{ paddingTop: 12, paddingBottom: 90 }}>
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <Avatar src={profile.avatar_url} nickname={profile.nickname} size={72} />
          <div style={{ margin: '12px auto 4px' }}>
            <Avatar src={profile.avatar_url} nickname={profile.nickname} size={72} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{profile.nickname}</h2>

          {/* 积分和信誉 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{profile.points}</div>
              <div style={{ fontSize: 11, color: '#bbb' }}>积分</div>
            </div>
            <div style={{ width: 1, background: 'var(--border-light)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: repInfo.color }}>{profile.reputation}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: repInfo.bg, color: repInfo.color, fontWeight: 600 }}>{repInfo.text}</span>
              </div>
              <div style={{ fontSize: 11, color: '#bbb' }}>信誉分</div>
            </div>
          </div>

          {/* 好友按钮 */}
          {friendStatus === 'accepted' ? (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn-accent" onClick={() => navigate(`/messages/${userId}`)}>💬 私信</button>
            </div>
          ) : friendStatus === 'pending' ? (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
              <button className="btn-accent" onClick={() => navigate(`/messages/${userId}`)}>💬 私信</button>
              <span style={{ fontSize: 13, color: '#bbb' }}>已申请好友</span>
            </div>
          ) : friendStatus === 'received' ? (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-accent" onClick={handleAcceptFriend}>✓ 同意</button>
              <button className="btn-ghost" onClick={handleRejectFriend}>拒绝</button>
              <button className="btn-ghost" onClick={() => navigate(`/messages/${userId}`)}>💬</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn-accent" onClick={handleAddFriend}>+ 加好友</button>
              <button className="btn-ghost" onClick={() => navigate(`/messages/${userId}`)}>💬 私信</button>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: '#bbb', marginBottom: 8, paddingLeft: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          TA 发布的活动
        </div>
        {activities.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#bbb', padding: 24, fontSize: 14 }}>还没有发布活动</div>
        ) : (
          activities.map(a => {
            const expired = new Date(a.start_time) < new Date()
            return (
              <div key={a.id} className="card" style={{ cursor: 'pointer', opacity: expired ? 0.55 : 1, padding: 0, overflow: 'hidden' }} onClick={() => navigate(`/activity/${a.id}`)}>
                {a.cover_url && (
                  <div style={{ width: '100%', height: 100, background: `url(${a.cover_url}) center/cover no-repeat` }} />
                )}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{a.title}</span>
                    {expired && <span className="tag tag-danger" style={{ fontSize: 11, flexShrink: 0, marginLeft: 8 }}>已结束</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#bbb' }}>🕐 {formatShortTime(a.start_time)} · 📍 {a.location}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

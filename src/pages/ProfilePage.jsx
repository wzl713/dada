import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import Navbar from '../components/Navbar'
import { uploadImage, compressImage } from '../utils/upload'
import { SkeletonProfile } from '../components/Skeleton'
import { formatShortTime } from '../utils/helpers'
import { useToast } from '../components/toast-context'
import { getReliabilitySummary } from '../utils/trust'

export default function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const avatarInputRef = useRef(null)

  const [profile, setProfile] = useState({
    nickname: '',
    email: '',
    avatar_url: '',
    school_name: '',
    bio: '',
  })
  const [reliabilitySummary, setReliabilitySummary] = useState({
    averageRating: 0,
    reviewCount: 0,
    topTags: [],
    positiveRate: 0,
    reliabilityScore: 0,
    punctualRate: 0,
    punctualSampleCount: 0,
    participatedCount: 0,
    reportCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [bio, setBio] = useState('')
  const [tab, setTab] = useState('published')
  const [myActivities, setMyActivities] = useState([])
  const [joinedActivities, setJoinedActivities] = useState([])

  useEffect(() => {
    let active = true

    async function loadProfile() {
      const [{ data }, summary] = await Promise.all([
        supabase
          .from('profiles')
          .select('nickname, avatar_url, school_name, bio')
          .eq('id', user.id)
          .single(),
        getReliabilitySummary(user.id),
      ])

      if (!active) return

      const name = data?.nickname || user.email?.split('@')[0] || user.phone || '用户'
      setProfile({
        nickname: name,
        email: user.email || user.phone || '',
        avatar_url: data?.avatar_url || '',
        school_name: data?.school_name || '',
        bio: data?.bio || '',
      })
      setNickname(name)
      setSchoolName(data?.school_name || '')
      setBio(data?.bio || '')
      setReliabilitySummary(summary)
      setLoading(false)
    }

    loadProfile()
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    let active = true

    async function loadActivities() {
      const { data: published } = await supabase
        .from('activities')
        .select('id, title, start_time, location, gender_requirement')
        .eq('creator_id', user.id)
        .order('start_time', { ascending: false })

      const { data: joined } = await supabase
        .from('activity_members')
        .select('activity_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      let joinedActivitiesList = []
      if (joined?.length) {
        const joinedIds = joined.map((item) => item.activity_id)
        const { data: acts } = await supabase
          .from('activities')
          .select('id, title, start_time, location, gender_requirement, creator_id')
          .in('id', joinedIds)
          .neq('creator_id', user.id)
          .order('start_time', { ascending: false })
        joinedActivitiesList = acts || []
      }

      if (!active) return
      setMyActivities(published || [])
      setJoinedActivities(joinedActivitiesList)
    }

    loadActivities()
    return () => {
      active = false
    }
  }, [user.id])

  async function handleSave() {
    if (!nickname.trim()) return

    const payload = {
      id: user.id,
      nickname: nickname.trim(),
      school_name: schoolName.trim(),
      bio: bio.trim(),
    }

    const { error } = await supabase.from('profiles').upsert(payload)
    if (error) {
      toast.error('保存失败')
      return
    }

    setProfile((prev) => ({
      ...prev,
      nickname: nickname.trim(),
      school_name: schoolName.trim(),
      bio: bio.trim(),
    }))
    setEditing(false)
    toast.success('资料已保存')
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file, 400, 0.8)
    const url = await uploadImage(compressed, 'avatars', user.id)

    if (!url) return

    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
    setProfile((prev) => ({ ...prev, avatar_url: url }))
    toast.success('头像已更新')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div>
        <Navbar title="我的" />
        <SkeletonProfile />
      </div>
    )
  }

  const displayActivities = tab === 'published' ? myActivities : joinedActivities
  const verifiedTags = [
    user.phone ? '📱 手机已验证' : null,
    user.email_confirmed_at ? '📧 邮箱已验证' : null,
    profile.school_name ? `🎓 ${profile.school_name}` : null,
  ].filter(Boolean)

  return (
    <div>
      <Navbar title="我的" />

      <div className="container" style={{ paddingTop: 12, paddingBottom: 90 }}>
        <div className="card" style={{ textAlign: 'center', padding: 28, marginBottom: 16 }}>
          <div
            onClick={() => avatarInputRef.current?.click()}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover no-repeat` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              margin: '0 auto 14px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {!profile.avatar_url && profile.nickname.charAt(0).toUpperCase()}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, padding: '2px 0', textAlign: 'center' }}>
              更换
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
          />

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
              <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="昵称" />
              <input className="input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="学校或常驻区域，例如：西电 / 曲江" />
              <textarea className="input" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="简单写下你常约什么，比如：电影、羽毛球、周末 Citywalk" />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-accent" style={{ flex: 1 }} onClick={handleSave}>保存</button>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>取消</button>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{profile.nickname}</h2>
              <p style={{ fontSize: 13, color: '#bbb', marginBottom: 8 }}>{profile.email}</p>
              {profile.bio && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 10 }}>{profile.bio}</p>}
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {verifiedTags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              <button className="btn-ghost" onClick={() => setEditing(true)}>编辑资料</button>
            </>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#bbb', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            我的靠谱度
          </div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                {reliabilitySummary.participatedCount || reliabilitySummary.reviewCount ? reliabilitySummary.reliabilityScore : '--'}
              </div>
              <div style={{ fontSize: 11, color: '#bbb' }}>靠谱度评分</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#22c55e' }}>
                {reliabilitySummary.punctualSampleCount ? `${reliabilitySummary.punctualRate}%` : '--'}
              </div>
              <div style={{ fontSize: 11, color: '#bbb' }}>守约率</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{reliabilitySummary.participatedCount}</div>
              <div style={{ fontSize: 11, color: '#bbb' }}>已参加</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {reliabilitySummary.topTags.length > 0 ? (
              reliabilitySummary.topTags.map((tag) => <span key={tag} className="tag tag-accent">{tag}</span>)
            ) : (
              <span style={{ fontSize: 13, color: '#999' }}>活动通过确认和互评后，会慢慢形成你的靠谱度。</span>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {[
            { icon: '🔔', label: '通知', path: '/notifications' },
            { icon: '📝', label: '发布活动', path: '/create' },
            { icon: '📄', label: '用户协议', path: '/legal/terms' },
            { icon: '🔒', label: '隐私政策', path: '/legal/privacy' },
          ].map((item) => (
            <div key={item.path} className="profile-menu-item" onClick={() => navigate(item.path)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
              <span style={{ color: '#ddd' }}>›</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
            {[{ key: 'published', label: '我发起的', count: myActivities.length }, { key: 'joined', label: '我参加的', count: joinedActivities.length }].map((item) => (
              <div
                key={item.key}
                style={{
                  flex: 1,
                  padding: '14px 0',
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  color: tab === item.key ? '#1a1a1a' : '#bbb',
                  borderBottom: tab === item.key ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                }}
                onClick={() => setTab(item.key)}
              >
                {item.label} <span style={{ fontSize: 12, color: '#bbb' }}>{item.count}</span>
              </div>
            ))}
          </div>
          {displayActivities.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-icon" style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div className="empty-state-desc">{tab === 'published' ? '还没有发起活动' : '还没有参加活动'}</div>
            </div>
          ) : (
            displayActivities.map((activity) => {
              const expired = new Date(activity.start_time) < new Date()
              return (
                <div key={activity.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }} onClick={() => navigate(`/activity/${activity.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{activity.title}</span>
                    {expired && <span className="tag tag-danger" style={{ fontSize: 11, flexShrink: 0, marginLeft: 8 }}>已结束</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#bbb' }}>
                    🕐 {formatShortTime(activity.start_time)} · 📍 {activity.location}
                    {activity.gender_requirement && activity.gender_requirement !== '不限' ? ` · ${activity.gender_requirement}` : ''}
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

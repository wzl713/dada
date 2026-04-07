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
import { DuckMascot, LineIcon } from '../components/DadaIcons'
import ReliabilityPanel from '../components/ReliabilityPanel'

const GENDER_OPTIONS = ['男', '女']
const BEHAVIOR_LABELS = {
  activity_created: '发起活动',
  join_requested: '申请加入',
  join_approved: '通过申请',
  departure_confirmed: '确认出发',
  activity_completed: '完成活动',
  user_reported: '举报用户',
  activity_reported: '举报活动',
  user_blocked: '拉黑用户',
}

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
    gender: '',
    bio: '',
    phone_bound: false,
    trust_badge: '',
    attended_count: 0,
    no_show_count: 0,
    completion_rate: 0,
    credit_level: '新用户',
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
    creditScore: 0,
    creditLevelKey: 'newbie',
    creditLevelLabel: '新人',
    completedCount: 0,
    missedConfirmCount: 0,
    noShowCount: 0,
    hostedCount: 0,
    activeApplicationCount: 0,
    canCreateActivity: true,
  })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [gender, setGender] = useState('')
  const [bio, setBio] = useState('')
  const [tab, setTab] = useState('published')
  const [myActivities, setMyActivities] = useState([])
  const [joinedActivities, setJoinedActivities] = useState([])
  const [blockedUsers, setBlockedUsers] = useState([])
  const [behaviorLogs, setBehaviorLogs] = useState([])

  useEffect(() => {
    let active = true

    async function loadProfile() {
      const [{ data }, summary] = await Promise.all([
        supabase
          .from('profiles')
          .select('nickname, avatar_url, school_name, gender, bio, phone_bound, trust_badge, attended_count, no_show_count, completion_rate, credit_level')
          .eq('id', user.id)
          .single(),
        getReliabilitySummary(user.id),
      ])

      if (!active) return

      const name = data?.nickname || user.email?.split('@')[0] || '用户'
      setProfile({
        nickname: name,
        email: user.email || (user.phone ? '手机号登录账号' : ''),
        avatar_url: data?.avatar_url || '',
        school_name: data?.school_name || '',
        gender: data?.gender || '',
        bio: data?.bio || '',
        phone_bound: Boolean(data?.phone_bound || user.phone),
        trust_badge: data?.trust_badge || (user.phone ? '已绑定手机号' : ''),
        attended_count: data?.attended_count || 0,
        no_show_count: data?.no_show_count || 0,
        completion_rate: data?.completion_rate || 0,
        credit_level: data?.credit_level || '新用户',
      })
      setNickname(name)
      setSchoolName(data?.school_name || '')
      setGender(data?.gender || '')
      setBio(data?.bio || '')
      if (!data?.gender) setEditing(true)
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

  useEffect(() => {
    let active = true

    async function loadSafetySummary() {
      const [{ data: blockRows }, { data: logs }] = await Promise.all([
        supabase
          .from('blocked_users')
          .select('blocked_user_id, created_at, reason')
          .eq('blocker_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('behavior_logs')
          .select('event_type, created_at, target_activity_id')
          .eq('actor_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      let blockedList = []
      if (blockRows?.length) {
        const ids = blockRows.map((item) => item.blocked_user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .in('id', ids)
        const profileMap = new Map((profiles || []).map((item) => [item.id, item]))
        blockedList = blockRows.map((item) => ({
          ...item,
          profile: profileMap.get(item.blocked_user_id),
        }))
      }

      if (!active) return
      setBlockedUsers(blockedList)
      setBehaviorLogs(logs || [])
    }

    loadSafetySummary()
    return () => {
      active = false
    }
  }, [user.id])

  async function handleSave() {
    if (!nickname.trim()) return
    if (!gender) {
      toast.error('请选择性别')
      return
    }

    const payload = {
      id: user.id,
      nickname: nickname.trim(),
      school_name: schoolName.trim(),
      gender,
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
      gender,
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
    profile.phone_bound || user.phone ? '已绑定手机号' : null,
    user.email_confirmed_at ? '邮箱已验证' : null,
    profile.gender ? `性别：${profile.gender}` : null,
    profile.school_name ? profile.school_name : null,
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
              <div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 8, fontWeight: 700, textAlign: 'left' }}>
                  性别（必填）
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {GENDER_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={gender === item ? 'btn-accent' : 'btn-ghost'}
                      style={{ flex: 1 }}
                      onClick={() => setGender(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
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

        <ReliabilityPanel title="我的靠谱度" summary={reliabilitySummary} profile={profile} />

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#bbb', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            我的安全记录
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>拉黑列表</div>
              {blockedUsers.length === 0 ? (
                <div style={{ fontSize: 13, color: '#999' }}>暂无拉黑用户。</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {blockedUsers.map((item) => (
                    <span key={item.blocked_user_id} className="tag">
                      {item.profile?.nickname || `用户${item.blocked_user_id.slice(0, 6)}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>行为记录摘要</div>
              {behaviorLogs.length === 0 ? (
                <div style={{ fontSize: 13, color: '#999' }}>暂无行为记录。</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {behaviorLogs.map((item) => (
                    <div key={`${item.event_type}-${item.created_at}`} style={{ fontSize: 13, color: '#666', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span>{BEHAVIOR_LABELS[item.event_type] || item.event_type}</span>
                      <span style={{ color: '#aaa' }}>{formatShortTime(item.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {[
            { icon: 'bell', label: '通知', path: '/notifications' },
            { icon: 'plus', label: '发布活动', path: '/create' },
            { icon: 'tag', label: '用户协议', path: '/legal/terms' },
            { icon: 'link', label: '隐私政策', path: '/legal/privacy' },
          ].map((item) => (
            <div key={item.path} className="profile-menu-item" onClick={() => navigate(item.path)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <LineIcon name={item.icon} size={17} />
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
              <div className="empty-state-icon" style={{ marginBottom: 8 }}><DuckMascot size={52} mood="sleepy" /></div>
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
                    <LineIcon name="clock" size={13} /> {formatShortTime(activity.start_time)} · <LineIcon name="location" size={13} /> {activity.location}
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

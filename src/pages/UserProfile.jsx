import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'
import { SkeletonProfile } from '../components/Skeleton'
import { formatShortTime } from '../utils/helpers'
import { useToast } from '../components/toast-context'
import { getReliabilitySummary } from '../utils/trust'
import { getBlockRelationship } from '../utils/safety'
import { CreditDuckBadge, DuckMascot, LineIcon } from '../components/DadaIcons'

export default function UserProfile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [profile, setProfile] = useState(null)
  const [activities, setActivities] = useState([])
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
  const [blockState, setBlockState] = useState({ blockedByMe: false, blockedMe: false })
  const [loading, setLoading] = useState(true)

  const isSelf = user?.id === userId

  useEffect(() => {
    if (isSelf) {
      navigate('/profile')
      return
    }

    let active = true

    async function loadUserData() {
      setLoading(true)
      const [{ data: prof }, summary, relation] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nickname, avatar_url, school_name, bio')
          .eq('id', userId)
          .single(),
        getReliabilitySummary(userId),
        getBlockRelationship(user.id, userId),
      ])

      if (!active) return

      setBlockState(relation)
      setReliabilitySummary(summary)
      setProfile({
        id: userId,
        nickname: prof?.nickname || `用户${userId.slice(0, 6)}`,
        avatar_url: prof?.avatar_url || '',
        school_name: prof?.school_name || '',
        bio: prof?.bio || '',
      })

      if (!relation.blockedByMe && !relation.blockedMe) {
        const { data: acts } = await supabase
          .from('activities')
          .select('id, title, start_time, location, cover_url, gender_requirement')
          .eq('creator_id', userId)
          .order('created_at', { ascending: false })

        if (!active) return
        setActivities(acts || [])
      }

      setLoading(false)
    }

    loadUserData()
    return () => {
      active = false
    }
  }, [isSelf, navigate, user.id, userId])

  async function handleBlock() {
    if (!window.confirm(`拉黑 ${profile.nickname} 后，你将不再看到 TA 的活动。继续吗？`)) return
    const reason = window.prompt('可选：填写拉黑原因', '') || ''
    const { error } = await supabase.from('blocked_users').insert({
      blocker_id: user.id,
      blocked_user_id: userId,
      reason,
    })

    if (error) {
      toast.error(error.message || '拉黑失败')
      return
    }

    setBlockState({ blockedByMe: true, blockedMe: false })
    setActivities([])
    toast.success('已拉黑该用户')
  }

  async function handleUnblock() {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .match({ blocker_id: user.id, blocked_user_id: userId })

    if (error) {
      toast.error('取消拉黑失败')
      return
    }

    setBlockState({ blockedByMe: false, blockedMe: false })
    toast.success('已取消拉黑')
  }

  async function handleReport() {
    const reason = window.prompt('请填写举报该用户的原因')
    if (!reason?.trim()) return

    const { error } = await supabase.from('user_reports').insert({
      reporter_id: user.id,
      reported_user_id: userId,
      reason: reason.trim(),
      report_type: 'user',
    })

    if (error) {
      toast.error(error.message || '举报失败')
      return
    }

    toast.success('举报已提交')
  }

  if (loading) {
    return (
      <div>
        <Navbar title="用户主页" showBack />
        <SkeletonProfile />
      </div>
    )
  }

  if (!profile) {
    return (
      <div>
        <Navbar title="用户主页" showBack />
        <div className="empty-state">
          <div className="empty-state-icon"><DuckMascot size={64} mood="worried" /></div>
          <div className="empty-state-title">用户不存在</div>
        </div>
      </div>
    )
  }

  const limited = blockState.blockedByMe || blockState.blockedMe

  return (
    <div>
      <Navbar title="用户主页" showBack />

      <div className="container" style={{ paddingTop: 12, paddingBottom: 90 }}>
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <Avatar src={profile.avatar_url} nickname={profile.nickname} size={72} />
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '12px 0 8px' }}>{profile.nickname}</h2>
          {profile.bio && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 10 }}>{profile.bio}</p>}

          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {profile.school_name && <span className="tag">{profile.school_name}</span>}
            {(reliabilitySummary.participatedCount > 0 || reliabilitySummary.reviewCount > 0) && (
              <span className="tag tag-accent">靠谱度 {reliabilitySummary.reliabilityScore}</span>
            )}
            {reliabilitySummary.punctualSampleCount > 0 && (
              <span className="tag tag-success">守约率 {reliabilitySummary.punctualRate}%</span>
            )}
            <span className="tag">已参加 {reliabilitySummary.participatedCount} 次</span>
            <CreditDuckBadge levelKey={reliabilitySummary.creditLevelKey} label={reliabilitySummary.creditLevelLabel} />
            <span className="tag">信用分 {reliabilitySummary.creditScore}</span>
          </div>

          {!limited && reliabilitySummary.topTags.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {reliabilitySummary.topTags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}

          {blockState.blockedMe && (
            <div style={{ background: '#fff7ed', color: '#c2410c', padding: '10px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.6 }}>
              对方已将你拉黑，你只能查看基础资料。
            </div>
          )}

          {!blockState.blockedMe && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {blockState.blockedByMe ? (
                <button className="btn-ghost" onClick={handleUnblock}>取消拉黑</button>
              ) : (
                <button className="btn-ghost" onClick={handleBlock}>拉黑</button>
              )}
              <button className="btn-ghost" onClick={handleReport}>举报</button>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: '#bbb', marginBottom: 8, paddingLeft: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          TA 发起的活动
        </div>

        {limited ? (
          <div className="card" style={{ color: '#999', fontSize: 13, lineHeight: 1.6 }}>
            存在拉黑关系时，不再展示对方的活动内容。
          </div>
        ) : activities.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#bbb', padding: 24, fontSize: 14 }}>还没有发布活动</div>
        ) : (
          activities.map((activity) => {
            const expired = new Date(activity.start_time) < new Date()
            return (
              <div key={activity.id} className="card" style={{ cursor: 'pointer', opacity: expired ? 0.55 : 1, padding: 0, overflow: 'hidden' }} onClick={() => navigate(`/activity/${activity.id}`)}>
                {activity.cover_url && (
                  <div style={{ width: '100%', height: 100, background: `url(${activity.cover_url}) center/cover no-repeat` }} />
                )}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{activity.title}</span>
                    {expired && <span className="tag tag-danger" style={{ fontSize: 11, flexShrink: 0, marginLeft: 8 }}>已结束</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#bbb' }}>
                    <LineIcon name="clock" size={13} /> {formatShortTime(activity.start_time)} · <LineIcon name="location" size={13} /> {activity.location}
                    {activity.gender_requirement && activity.gender_requirement !== '不限' ? ` · ${activity.gender_requirement}` : ''}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'
import CommentSection from '../components/CommentSection'
import PhotoGallery from '../components/PhotoGallery'
import ShareButton from '../components/ShareButton'
import ActivityReviewSection from '../components/ActivityReviewSection'
import { SkeletonDetail } from '../components/Skeleton'
import { formatTime, getUserInfo } from '../utils/helpers'
import { useToast } from '../components/toast-context'
import { getBlockRelationship } from '../utils/safety'
import { getCreditSummary } from '../utils/trust'

const DEPARTURE_WINDOW_MS = 60 * 60 * 1000

function isDepartureWindowOpen(startTime) {
  const msUntilStart = new Date(startTime).getTime() - Date.now()
  return msUntilStart <= DEPARTURE_WINDOW_MS
}

function getMemberBadge(member, activity) {
  if (member.status === 'pending') return { text: '待确认', color: '#f59e0b', bg: '#fffbeb' }
  if (member.status === 'rejected') return { text: '已拒绝', color: '#ef4444', bg: '#fef2f2' }
  if (member.noShowMarkedAt) return { text: '已标记鸽子', color: '#ef4444', bg: '#fef2f2' }
  if (member.departureConfirmedAt) return { text: '已确认出发', color: '#22c55e', bg: 'var(--success-bg)' }
  if (activity && isDepartureWindowOpen(activity.start_time)) return { text: '可能鸽子', color: '#f59e0b', bg: '#fffbeb' }
  return { text: '已通过', color: '#22c55e', bg: 'var(--success-bg)' }
}

export default function ActivityDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [activity, setActivity] = useState(null)
  const [creator, setCreator] = useState(null)
  const [members, setMembers] = useState([])
  const [myMembership, setMyMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blockState, setBlockState] = useState({ blockedByMe: false, blockedMe: false })

  useEffect(() => {
    async function loadDetail() {
      setLoading(true)
      const { data: act } = await supabase.from('activities').select('*').eq('id', id).single()
      if (!act) {
        setLoading(false)
        return
      }

      const creatorInfo = await getUserInfo(act.creator_id)
      setCreator({ id: act.creator_id, ...creatorInfo })

      const { data: memberRows } = await supabase
        .from('activity_members')
        .select('user_id, joined_at, status, approved_at, departure_confirmed_at, no_show_marked_at')
        .eq('activity_id', id)

      const memberInfos = await Promise.all(
        (memberRows || []).map(async (item) => {
          const info = await getUserInfo(item.user_id)
          const credit = await getCreditSummary(item.user_id)
          return {
            id: item.user_id,
            ...info,
            credit,
            joinedAt: item.joined_at,
            status: item.status || 'pending',
            approvedAt: item.approved_at,
            departureConfirmedAt: item.departure_confirmed_at,
            noShowMarkedAt: item.no_show_marked_at,
          }
        })
      )

      setActivity(act)
      setMembers(memberInfos)
      setMyMembership((memberRows || []).find((item) => item.user_id === user.id) || null)

      if (act.creator_id !== user.id) {
        setBlockState(await getBlockRelationship(user.id, act.creator_id))
      }

      setLoading(false)
    }

    loadDetail()
  }, [id, user.id])

  async function refreshMembers() {
    const { data: memberRows } = await supabase
      .from('activity_members')
      .select('user_id, joined_at, status, approved_at, departure_confirmed_at, no_show_marked_at')
      .eq('activity_id', id)

    const memberInfos = await Promise.all(
      (memberRows || []).map(async (item) => {
        const info = await getUserInfo(item.user_id)
        const credit = await getCreditSummary(item.user_id)
        return {
          id: item.user_id,
          ...info,
          credit,
          joinedAt: item.joined_at,
          status: item.status || 'pending',
          approvedAt: item.approved_at,
          departureConfirmedAt: item.departure_confirmed_at,
          noShowMarkedAt: item.no_show_marked_at,
        }
      })
    )

    setMembers(memberInfos)
    setMyMembership((memberRows || []).find((item) => item.user_id === user.id) || null)
  }

  async function handleJoin() {
    if (blockState.blockedByMe || blockState.blockedMe) {
      toast.error('你与发起人存在拉黑关系，无法加入')
      return
    }

    const { error } = await supabase.rpc('request_join_activity', {
      p_activity_id: id,
    })

    if (error) {
      toast.error(error.message || '申请失败')
      return
    }

    toast.success('申请已提交，等待发起人确认')
    refreshMembers()
  }

  async function handleLeave() {
    const { error } = await supabase
      .from('activity_members')
      .delete()
      .match({ activity_id: id, user_id: user.id })

    if (error) {
      toast.error('取消失败')
      return
    }

    setMyMembership(null)
    refreshMembers()
  }

  async function handleMemberStatus(memberId, status) {
    if (status === 'rejected') {
      const { error } = await supabase
        .from('activity_members')
        .delete()
        .match({ activity_id: id, user_id: memberId })

      if (error) {
        toast.error(error.message || '处理申请失败')
        return
      }

      toast.success('已拒绝该申请')
      refreshMembers()
      return
    }

    const { error } = await supabase
      .from('activity_members')
      .update({
        status,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .match({ activity_id: id, user_id: memberId })

    if (error) {
      toast.error(error.message || '处理申请失败')
      return
    }

    toast.success(status === 'approved' ? '已同意对方参加' : '已拒绝该申请')
    refreshMembers()
  }

  async function handleConfirmDeparture() {
    const { error } = await supabase.rpc('confirm_activity_departure', {
      p_activity_id: id,
    })

    if (error) {
      toast.error(error.message || '确认出发失败')
      return
    }

    toast.success('已确认出发，发起人会看到你的状态')
    refreshMembers()
  }

  async function handleMarkNoShow(memberId) {
    if (!window.confirm('确定要把这个用户标记为鸽子吗？这会影响 TA 的信用等级。')) return

    const { error } = await supabase.rpc('mark_activity_no_show', {
      p_activity_id: id,
      p_user_id: memberId,
    })

    if (error) {
      toast.error(error.message || '标记失败')
      return
    }

    toast.success('已标记鸽子')
    refreshMembers()
  }

  async function handleDelete() {
    if (!window.confirm('确定要删除这个活动吗？所有参与记录和互评也会一并删除。')) return
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (error) {
      toast.error('删除失败')
      return
    }
    navigate('/')
  }

  async function handleBlockCreator() {
    if (!creator || creator.id === user.id) return
    if (!window.confirm(`拉黑 ${creator.nickname} 后，你将不再看到 TA 的活动。继续吗？`)) return

    const reason = window.prompt('可选：记录一下拉黑原因，便于你自己回看。', '') || ''
    const { error } = await supabase.from('blocked_users').insert({
      blocker_id: user.id,
      blocked_user_id: creator.id,
      reason,
    })

    if (error) {
      toast.error(error.message || '拉黑失败')
      return
    }

    setBlockState({ blockedByMe: true, blockedMe: false })
    toast.success('已拉黑，首页不会再展示 TA 的活动')
  }

  async function handleReport(type) {
    const reason = window.prompt(type === 'activity' ? '请填写举报该活动的原因' : '请填写举报该用户的原因')
    if (!reason?.trim()) return

    const payload = {
      reporter_id: user.id,
      reason: reason.trim(),
      report_type: type,
      activity_id: type === 'activity' ? id : null,
      reported_user_id: type === 'user' ? creator?.id || null : null,
    }

    const { error } = await supabase.from('user_reports').insert(payload)
    if (error) {
      toast.error(error.message || '举报失败')
      return
    }

    toast.success('举报已提交，我们会尽快处理')
  }

  if (loading) {
    return (
      <div>
        <Navbar title="活动详情" showBack />
        <SkeletonDetail />
      </div>
    )
  }

  if (!activity) {
    return (
      <div>
        <Navbar title="活动详情" showBack />
        <div className="empty-state">
          <div className="empty-state-icon">🤷</div>
          <div className="empty-state-title">活动不存在</div>
          <div className="empty-state-desc">该活动可能已被删除</div>
        </div>
      </div>
    )
  }

  const isCreator = user.id === activity.creator_id
  const approvedMembers = members.filter((member) => member.status === 'approved')
  const pendingMembers = members
    .filter((member) => member.status === 'pending')
    .sort((a, b) => {
      const aPriority = ['high_credit', 'quality_creator'].includes(a.credit?.level_key) ? 1 : 0
      const bPriority = ['high_credit', 'quality_creator'].includes(b.credit?.level_key) ? 1 : 0
      return bPriority - aPriority
    })
  const isFull = approvedMembers.length >= activity.max_members
  const isExpired = new Date(activity.start_time) < new Date()
  const isApproved = myMembership?.status === 'approved'
  const isPending = myMembership?.status === 'pending'
  const canParticipate = isCreator || isApproved
  const departureWindowOpen = isDepartureWindowOpen(activity.start_time)
  const canConfirmDeparture = isApproved && !myMembership?.departure_confirmed_at && !isExpired && departureWindowOpen
  const spotsLeft = Math.max((activity.max_members || 0) - approvedMembers.length, 0)
  const scarcityText = spotsLeft === 0 ? '名额已满' : spotsLeft <= 2 ? `仅剩 ${spotsLeft} 个名额` : `还差 ${spotsLeft} 人满员`

  return (
    <div>
      <Navbar title="活动详情" showBack />

      <div className="container" style={{ paddingTop: 12, paddingBottom: 100 }}>
        {isExpired && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 12, marginBottom: 12, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
            该活动已结束，可以在下方进行互评
          </div>
        )}

        {(blockState.blockedByMe || blockState.blockedMe) && (
          <div style={{ background: '#fff7ed', color: '#c2410c', padding: '10px 16px', borderRadius: 12, marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
            {blockState.blockedByMe
              ? '你已拉黑该发起人，不能再加入或讨论。'
              : '对方已将你拉黑，当前活动仅可查看基础信息。'}
          </div>
        )}

        {activity.cover_url && (
          <div
            style={{
              width: '100%',
              height: 200,
              borderRadius: 16,
              marginBottom: 12,
              background: `url(${activity.cover_url}) center/cover no-repeat`,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
            }}
          />
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.4, flex: 1 }}>{activity.title}</h2>
            {activity.category && activity.category !== '其他' && (
              <span className="tag tag-accent" style={{ flexShrink: 0 }}>{activity.category}</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: '#666', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>🕐</span><span>{formatTime(activity.start_time)}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>📍</span><span>{activity.location}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>👥</span><span>{approvedMembers.length}/{activity.max_members} 人已确认参加 · {scarcityText}</span></div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: activity.description ? 16 : 0 }}>
            {activity.gender_requirement && activity.gender_requirement !== '不限' && (
              <span className="tag tag-accent">🙋 {activity.gender_requirement}</span>
            )}
            <span className="tag">⚡ 不聊天太久，优先直接见面</span>
            <span className="tag tag-success">{scarcityText}</span>
          </div>

          {activity.description && (
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7, whiteSpace: 'pre-wrap', paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
              {activity.description}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 11, color: '#bbb', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>发起人</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: isCreator ? 'default' : 'pointer' }} onClick={() => { if (!isCreator) navigate(`/user/${activity.creator_id}`) }}>
            <Avatar src={creator?.avatar_url} nickname={creator?.nickname || ''} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {creator?.nickname}
                {isCreator && <span style={{ fontSize: 12, color: '#bbb', marginLeft: 8 }}>(我)</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {creator?.school_name && <span className="tag">🎓 {creator.school_name}</span>}
                <span className="tag tag-success">✅ 活动后可互评</span>
              </div>
            </div>
            {!isCreator && <span style={{ color: '#ddd', fontSize: 18 }}>›</span>}
          </div>

          {!isCreator && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn-ghost" onClick={() => handleReport('user')}>举报用户</button>
              {!blockState.blockedByMe && (
                <button type="button" className="btn-ghost" onClick={handleBlockCreator}>拉黑用户</button>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 11, color: '#bbb', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>集合与安全</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: '#666', lineHeight: 1.7 }}>
            <div>
              <div style={{ fontWeight: 600, color: '#333', marginBottom: 4 }}>集合方式</div>
              <div>{activity.meetup_note || '发起人暂未补充集合说明，建议进活动后尽快确认。'}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#333', marginBottom: 4 }}>安全提示</div>
              <div>{activity.safety_notice || '建议优先选择公开场所，并提前把行程分享给朋友。'}</div>
              <div style={{ marginTop: 6, color: 'var(--accent)', fontWeight: 600 }}>建议首次见面选择公共场所。</div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ShareButton activity={activity} label="分享行程" />
            {!isCreator && (
              <button type="button" className="btn-ghost" onClick={() => handleReport('activity')}>举报活动</button>
            )}
          </div>
        </div>

        {pendingMembers.length > 0 && isCreator && (
          <div className="card">
            <div style={{ fontSize: 11, color: '#bbb', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              待确认申请 ({pendingMembers.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingMembers.map((member) => (
                <div
                  key={member.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <Avatar src={member.avatar_url} nickname={member.nickname} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{member.nickname}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {member.credit?.level_label || '🟢 新人'} · 想参加，等待你确认
                    </div>
                    {['high_credit', 'quality_creator'].includes(member.credit?.level_key) && (
                      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>高信用用户，建议优先通过</div>
                    )}
                  </div>
                  <button type="button" className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleMemberStatus(member.id, 'rejected')}>拒绝</button>
                  <button type="button" className="btn-accent" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleMemberStatus(member.id, 'approved')}>同意</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {approvedMembers.length > 0 && (
          <div className="card">
            <div style={{ fontSize: 11, color: '#bbb', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              已确认参加 ({approvedMembers.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {approvedMembers.map((member) => {
                const badge = getMemberBadge(member, activity)
                return (
                  <div
                    key={member.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: member.id !== user.id ? 'pointer' : 'default' }}
                    onClick={() => { if (member.id !== user.id) navigate(`/user/${member.id}`) }}
                  >
                    <Avatar src={member.avatar_url} nickname={member.nickname} size={32} />
                    <span style={{ fontSize: 13 }}>
                      {member.nickname}
                      {member.id === user.id && <span style={{ color: '#bbb', marginLeft: 4 }}>(我)</span>}
                    </span>
                    <span style={{ fontSize: 11, color: badge.color, background: badge.bg, borderRadius: 999, padding: '3px 8px', fontWeight: 600 }}>
                      {badge.text}
                    </span>
                    <span style={{ fontSize: 11, color: '#999' }}>{member.credit?.level_label}</span>
                    {isCreator && isExpired && !member.noShowMarkedAt && (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleMarkNoShow(member.id)
                        }}
                      >
                        标记鸽子
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <CommentSection activityId={id} canParticipate={canParticipate && !blockState.blockedByMe && !blockState.blockedMe} />

        <PhotoGallery activityId={id} canUpload={canParticipate && !blockState.blockedByMe && !blockState.blockedMe} />

        <ActivityReviewSection
          activityId={id}
          activity={activity}
          creator={creator}
          members={approvedMembers}
          isCreator={isCreator}
          isJoined={isApproved}
          isExpired={isExpired}
        />

        {isCreator ? (
          <div style={{ display: 'flex', gap: 12, position: 'fixed', bottom: 70, left: 16, right: 16, maxWidth: 448, margin: '0 auto' }}>
            {!isExpired && <button className="btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/edit/${id}`)}>编辑活动</button>}
            <button className="btn-outline" style={{ flex: isExpired ? 1 : undefined, borderColor: '#ef4444', color: '#ef4444' }} onClick={handleDelete}>删除</button>
          </div>
        ) : !isExpired && (
          <div style={{ position: 'fixed', bottom: 70, left: 16, right: 16, maxWidth: 448, margin: '0 auto' }}>
            {isApproved ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className={canConfirmDeparture ? 'btn-primary' : 'btn-outline'}
                  style={{ flex: 1 }}
                  onClick={handleConfirmDeparture}
                  disabled={!canConfirmDeparture}
                >
                  {myMembership?.departure_confirmed_at
                    ? '已确认出发'
                    : departureWindowOpen
                      ? '确认出发'
                      : '活动前1小时确认'}
                </button>
                <button className="btn-outline" style={{ flex: 1 }} onClick={handleLeave}>取消报名</button>
              </div>
            ) : isPending ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, padding: 14, background: '#fffbeb', color: '#f59e0b', borderRadius: 12, fontSize: 16, fontWeight: 600, textAlign: 'center' }}>等待发起人确认</div>
                <button className="btn-outline" style={{ flex: 1 }} onClick={handleLeave}>取消申请</button>
              </div>
            ) : isFull ? (
              <div style={{ width: '100%', padding: 14, background: '#f5f5f5', color: '#bbb', borderRadius: 12, fontSize: 16, fontWeight: 600, textAlign: 'center' }}>已满员</div>
            ) : (
              <button className="btn-primary" onClick={handleJoin} disabled={blockState.blockedByMe || blockState.blockedMe}>
                申请加入
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

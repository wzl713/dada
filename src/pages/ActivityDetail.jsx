import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'
import CommentSection from '../components/CommentSection'
import PhotoGallery from '../components/PhotoGallery'
import ShareButton from '../components/ShareButton'
import { SkeletonDetail } from '../components/Skeleton'
import { formatTime, getUserInfo } from '../utils/helpers'
import { useToast } from '../components/Toast'

export default function ActivityDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [activity, setActivity] = useState(null)
  const [creator, setCreator] = useState(null)
  const [members, setMembers] = useState([])
  const [isJoined, setIsJoined] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDetail() }, [id])

  const fetchDetail = async () => {
    setLoading(true)
    const { data: act } = await supabase.from('activities').select('*').eq('id', id).single()
    if (!act) { setLoading(false); return }
    setActivity(act)

    const creatorInfo = await getUserInfo(act.creator_id)
    setCreator({ id: act.creator_id, ...creatorInfo })

    const { data: mems } = await supabase.from('activity_members').select('user_id, joined_at').eq('activity_id', id)
    if (mems) {
      const memsWithNames = await Promise.all(
        mems.map(async m => {
          const info = await getUserInfo(m.user_id)
          return { id: m.user_id, ...info, joinedAt: m.joined_at }
        })
      )
      setMembers(memsWithNames)
      setIsJoined(mems.some(m => m.user_id === user.id))
    }
    setLoading(false)
  }

  const handleJoin = async () => {
    const { error } = await supabase.from('activity_members').insert({ activity_id: id, user_id: user.id })
    if (!error) { setIsJoined(true); fetchDetail(); toast.success('加入成功！') }
    else toast.error('操作失败')
  }

  const handleLeave = async () => {
    const { error } = await supabase.from('activity_members').delete().match({ activity_id: id, user_id: user.id })
    if (!error) { setIsJoined(false); fetchDetail() }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这个活动吗？所有参与记录也会一并删除。')) return
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (!error) navigate('/')
  }

  const isCreator = user?.id === activity?.creator_id
  const isFull = activity ? members.length >= activity.max_members : false
  const isExpired = activity ? new Date(activity.start_time) < new Date() : false

  if (loading) return <div><Navbar title="活动详情" showBack /><SkeletonDetail /></div>

  if (!activity) return (
    <div><Navbar title="活动详情" showBack />
      <div className="empty-state">
        <div className="empty-state-icon">🤷</div>
        <div className="empty-state-title">活动不存在</div>
        <div className="empty-state-desc">该活动可能已被删除</div>
      </div>
    </div>
  )

  return (
    <div>
      <Navbar title="活动详情" showBack />

      <div className="container" style={{ paddingTop: 12, paddingBottom: 100 }}>
        {isExpired && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 12, marginBottom: 12, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
            ⏰ 该活动已结束
          </div>
        )}

        {/* 封面图 */}
        {activity.cover_url && (
          <div style={{
            width: '100%', height: 200, borderRadius: 16, marginBottom: 12,
            background: `url(${activity.cover_url}) center/cover no-repeat`,
            overflow: 'hidden', boxShadow: 'var(--shadow-md)',
          }} />
        )}

        {/* 主信息 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.4, flex: 1 }}>{activity.title}</h2>
            {activity.category && activity.category !== '其他' && (
              <span className="tag tag-accent" style={{ flexShrink: 0, marginLeft: 8 }}>{activity.category}</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: '#666', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>🕐</span><span>{formatTime(activity.start_time)}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>📍</span><span>{activity.location}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>👥</span><span>{members.length}/{activity.max_members} 人已参加</span></div>
          </div>

          {activity.description && (
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '12px 0', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 11, color: '#bbb', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>活动详情</div>
              {activity.description}
            </div>
          )}

          {/* 分享按钮 */}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <ShareButton activity={activity} />
          </div>
        </div>

        {/* 发布者 */}
        <div className="card">
          <div style={{ fontSize: 11, color: '#bbb', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>发布者</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => { if (!isCreator) navigate(`/user/${activity.creator_id}`) }}>
            <Avatar src={creator.avatar_url} nickname={creator.nickname} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{creator.nickname}{isCreator && <span style={{ fontSize: 12, color: '#bbb', marginLeft: 8 }}>(我)</span>}</div>
            </div>
            {!isCreator && <span style={{ color: '#ddd', fontSize: 18 }}>›</span>}
          </div>
        </div>

        {/* 参与者 */}
        {members.length > 0 && (
          <div className="card">
            <div style={{ fontSize: 11, color: '#bbb', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              参与者 ({members.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {members.map(m => (
                <div key={m.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: m.id !== user.id ? 'pointer' : 'default' }}
                  onClick={() => { if (m.id !== user.id) navigate(`/user/${m.id}`) }}>
                  <Avatar src={m.avatar_url} nickname={m.nickname} size={32} />
                  <span style={{ fontSize: 13 }}>
                    {m.nickname}{m.id === user.id && <span style={{ color: '#bbb', marginLeft: 4 }}>(我)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 评论区 */}
        <CommentSection activityId={id} />

        {/* 活动相册 */}
        <PhotoGallery activityId={id} />

        {/* 底部操作 */}
        {isCreator ? (
          <div style={{ display: 'flex', gap: 12, position: 'fixed', bottom: 70, left: 16, right: 16, maxWidth: 448, margin: '0 auto' }}>
            {!isExpired && <button className="btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/edit/${id}`)}>✏️ 编辑</button>}
            <button className="btn-outline" style={{ flex: isExpired ? 1 : undefined, borderColor: '#ef4444', color: '#ef4444' }} onClick={handleDelete}>删除</button>
          </div>
        ) : !isExpired && (
          <div style={{ position: 'fixed', bottom: 70, left: 16, right: 16, maxWidth: 448, margin: '0 auto' }}>
            {isJoined ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, padding: 14, background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 12, fontSize: 16, fontWeight: 600, textAlign: 'center' }}>✓ 已加入</div>
                <button className="btn-outline" style={{ flex: 1 }} onClick={handleLeave}>取消</button>
              </div>
            ) : isFull ? (
              <div style={{ width: '100%', padding: 14, background: '#f5f5f5', color: '#bbb', borderRadius: 12, fontSize: 16, fontWeight: 600, textAlign: 'center' }}>已满员</div>
            ) : (
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} onClick={handleJoin}>加入活动</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

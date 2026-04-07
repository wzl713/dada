import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { formatTime } from '../utils/helpers'

export default function ActivityCard({ activity, onJoin, onLeave, onDelete, membershipStatus, isFull }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isCreator = user?.id === activity.creator_id
  const isExpired = new Date(activity.start_time) < new Date()
  const membershipText = membershipStatus === 'approved' ? '✓ 已通过' : membershipStatus === 'rejected' ? '未通过' : '待确认'
  const membershipColor = membershipStatus === 'approved' ? '#22c55e' : membershipStatus === 'rejected' ? '#ef4444' : '#f59e0b'
  const spotsLeft = Math.max((activity.max_members || 0) - (activity.member_count || 0), 0)
  const scarcityText = spotsLeft === 0 ? '名额已满' : spotsLeft <= 2 ? `仅剩 ${spotsLeft} 个名额` : `还差 ${spotsLeft} 人满员`

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        opacity: isExpired ? 0.55 : 1,
        padding: 0,
        overflow: 'hidden',
      }}
      onClick={() => navigate(`/activity/${activity.id}`)}
    >
      {/* 封面图 */}
      {activity.cover_url && (
        <div style={{
          width: '100%', height: 140,
          background: `url(${activity.cover_url}) center/cover no-repeat`,
          position: 'relative',
        }}>
          {/* 类型标签 */}
          {activity.category && activity.category !== '其他' && (
            <span style={{
              position: 'absolute', top: 10, left: 10,
              fontSize: 11, color: '#fff', background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              padding: '3px 10px', borderRadius: 20, fontWeight: 500,
            }}>
              {activity.category}
            </span>
          )}
          {isExpired && (
            <span style={{
              position: 'absolute', top: 10, right: 10,
              fontSize: 11, color: '#fff', background: 'rgba(239,68,68,0.8)',
              padding: '3px 10px', borderRadius: 20, fontWeight: 500,
            }}>
              已结束
            </span>
          )}
        </div>
      )}

      {/* 内容区 */}
      <div style={{ padding: '14px 16px' }}>
        {/* 标题行 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, flex: 1, marginRight: 8 }}>
            {activity.title}
          </h3>
          {!activity.cover_url && activity.category && activity.category !== '其他' && (
            <span className="tag tag-accent" style={{ flexShrink: 0 }}>
              {activity.category}
            </span>
          )}
          {!activity.cover_url && isExpired && (
            <span className="tag tag-danger" style={{ flexShrink: 0 }}>已结束</span>
          )}
        </div>

        {/* 信息行 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, fontSize: 13, color: '#888' }}>
          <span>🕐 {formatTime(activity.start_time)}</span>
          <span>📍 {activity.location}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {activity.gender_requirement && activity.gender_requirement !== '不限' && (
            <span className="tag tag-accent">🙋 {activity.gender_requirement}</span>
          )}
        </div>

        {/* 底部：人数 + 按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tag">
            👥 {activity.member_count}/{activity.max_members} 人
          </span>
          {!isExpired && (
            <span className={spotsLeft <= 2 ? 'tag tag-accent' : 'tag'}>
              {scarcityText}
            </span>
          )}

          {isExpired ? null : isCreator ? (
            <button
              className="btn-ghost"
              style={{ padding: '5px 12px', fontSize: 12, color: '#ef4444', borderColor: '#fecaca' }}
              onClick={(e) => { e.stopPropagation(); onDelete(activity.id) }}
            >
              删除
            </button>
          ) : membershipStatus ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: membershipColor, fontWeight: 600 }}>
                {membershipText}
              </span>
              <button
                className="btn-ghost"
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={(e) => { e.stopPropagation(); onLeave(activity.id) }}
              >
                取消
              </button>
            </div>
          ) : isFull ? (
            <span style={{ fontSize: 12, color: '#bbb', fontWeight: 500 }}>已满员</span>
          ) : (
            <button
              style={{
                padding: '7px 20px', background: 'var(--primary)', color: '#fff',
                border: 'none', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
              onClick={(e) => { e.stopPropagation(); onJoin(activity.id) }}
            >
              申请加入
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

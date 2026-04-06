import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import Avatar from './Avatar'
import { useToast } from './toast-context'

const REVIEW_TAGS = ['守时', '靠谱', '好沟通', '边界感好', '临时鸽了']

function ReviewCard({ target, draft, onChange, onSubmit, disabled, submitted }) {
  return (
    <div style={{ padding: 14, border: '1px solid var(--border-light)', borderRadius: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Avatar src={target.avatar_url} nickname={target.nickname} size={36} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{target.nickname}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{target.label}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(target.id, { ...draft, rating: value })}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: draft.rating === value ? 'none' : '1px solid var(--border)',
              background: draft.rating === value ? 'var(--accent)' : '#fff',
              color: draft.rating === value ? '#fff' : '#666',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {value}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {REVIEW_TAGS.map((tag) => {
          const selected = draft.tags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange(target.id, {
                  ...draft,
                  tags: selected
                    ? draft.tags.filter((item) => item !== tag)
                    : [...draft.tags, tag].slice(0, 3),
                })
              }
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: selected ? 'none' : '1px solid var(--border)',
                background: selected ? 'var(--accent-bg)' : '#fff',
                color: selected ? 'var(--accent)' : '#666',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'inherit',
              }}
            >
              {tag}
            </button>
          )
        })}
      </div>

      <textarea
        className="input"
        rows={2}
        value={draft.comment}
        disabled={disabled}
        onChange={(event) => onChange(target.id, { ...draft, comment: event.target.value })}
        placeholder="可选：留一句真实反馈"
      />

      <button
        type="button"
        className="btn-primary"
        disabled={disabled || !draft.rating}
        style={{ marginTop: 10, padding: 12, fontSize: 14 }}
        onClick={() => onSubmit(target.id)}
      >
        {submitted ? '已提交评价' : '提交评价'}
      </button>
    </div>
  )
}

export default function ActivityReviewSection({ activityId, creator, members, isCreator, isJoined, isExpired }) {
  const { user } = useAuth()
  const toast = useToast()
  const [drafts, setDrafts] = useState({})
  const [submittedIds, setSubmittedIds] = useState([])
  const [loading, setLoading] = useState(true)

  const targets = useMemo(() => {
    if (!isExpired) return []
    if (isCreator) {
      return members
        .filter((member) => member.id !== user.id)
        .map((member) => ({ ...member, label: '参与者' }))
    }

    if (isJoined && creator) {
      return [{ ...creator, label: '发起人' }]
    }

    return []
  }, [creator, isCreator, isExpired, isJoined, members, user.id])

  useEffect(() => {
    let active = true

    async function loadSubmitted() {
      if (!targets.length) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('activity_reviews')
        .select('reviewee_id')
        .eq('activity_id', activityId)
        .eq('reviewer_id', user.id)

      if (!active) return
      setSubmittedIds((data || []).map((item) => item.reviewee_id))
      setLoading(false)
    }

    loadSubmitted()
    return () => {
      active = false
    }
  }, [activityId, targets, user.id])

  function updateDraft(targetId, value) {
    setDrafts((prev) => ({
      ...prev,
      [targetId]: value,
    }))
  }

  async function handleSubmit(targetId) {
    const draft = drafts[targetId] || { rating: 0, tags: [], comment: '' }
    if (!draft.rating) return

    const payload = {
      activity_id: activityId,
      reviewer_id: user.id,
      reviewee_id: targetId,
      rating: draft.rating,
      tags: draft.tags,
      comment: draft.comment.trim(),
    }

    const { error } = await supabase.from('activity_reviews').upsert(payload, {
      onConflict: 'activity_id,reviewer_id,reviewee_id',
    })

    if (error) {
      toast.error(error.message || '评价提交失败')
      return
    }

    setSubmittedIds((prev) => Array.from(new Set([...prev, targetId])))
    toast.success('评价已提交')
  }

  if (!isExpired || (!isCreator && !isJoined)) return null

  return (
    <div className="card">
      <div style={{ fontSize: 11, color: '#bbb', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        活动后互评
      </div>
      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 14 }}>
        只对真实参加过的人开放，帮助后来的用户判断是否守时、靠谱、好沟通。
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>加载评价对象中...</div>
      ) : targets.length === 0 ? (
        <div style={{ fontSize: 13, color: '#999' }}>活动结束后，这里会出现可评价的人。</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {targets.map((target) => {
            const draft = drafts[target.id] || { rating: 0, tags: [], comment: '' }
            const submitted = submittedIds.includes(target.id)
            return (
              <ReviewCard
                key={target.id}
                target={target}
                draft={draft}
                disabled={submitted}
                submitted={submitted}
                onChange={updateDraft}
                onSubmit={handleSubmit}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

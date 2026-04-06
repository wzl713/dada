import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import Avatar from './Avatar'
import { timeAgo, getUserInfo } from '../utils/helpers'

export default function CommentSection({ activityId, canParticipate }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    let active = true

    async function loadComments() {
      setLoading(true)
      const { data } = await supabase
        .from('comments')
        .select('id, user_id, content, created_at')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true })

      if (!active) return

      const withProfiles = await Promise.all(
        (data || []).map(async (item) => {
          const info = await getUserInfo(item.user_id)
          return { ...item, nickname: info.nickname, avatar_url: info.avatar_url }
        })
      )

      if (!active) return
      setComments(withProfiles)
      setLoading(false)
    }

    loadComments()
    return () => {
      active = false
    }
  }, [activityId])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!content.trim() || submitting || !canParticipate) return

    setSubmitting(true)
    const nextContent = content.trim()
    const { error } = await supabase.from('comments').insert({
      activity_id: activityId,
      user_id: user.id,
      content: nextContent,
    })

    if (!error) {
      const info = await getUserInfo(user.id)
      setComments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          user_id: user.id,
          content: nextContent,
          created_at: new Date().toISOString(),
          nickname: info.nickname,
          avatar_url: info.avatar_url,
        },
      ])
      setContent('')
      inputRef.current?.focus()
    }

    setSubmitting(false)
  }

  async function handleDelete(commentId) {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (!error) {
      setComments((prev) => prev.filter((item) => item.id !== commentId))
    }
  }

  return (
    <div className="card">
      <div style={{ fontSize: 11, color: '#bbb', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        活动内讨论 ({comments.length})
      </div>

      {!canParticipate && (
        <div style={{ background: '#f8f7ff', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          加入活动后才能进入讨论区，避免聊很久却不见面。
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Avatar src={undefined} nickname="" size={32} />
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            className="input"
            placeholder={canParticipate ? '说下到达时间、集合点或注意事项...' : '加入后才能发言'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!canParticipate}
            style={{ paddingRight: 60, fontSize: 14, padding: '10px 60px 10px 14px' }}
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting || !canParticipate}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              background: content.trim() && canParticipate ? 'var(--accent)' : '#ddd',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            发送
          </button>
        </div>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#bbb', fontSize: 13 }}>加载讨论中...</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#ddd', fontSize: 13 }}>还没有讨论，先确认下集合点吧</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {comments.map((comment) => (
            <div key={comment.id} style={{ display: 'flex', gap: 10 }}>
              <Avatar src={comment.avatar_url} nickname={comment.nickname} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{comment.nickname}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#ccc' }}>{timeAgo(comment.created_at)}</span>
                    {comment.user_id === user?.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        style={{ background: 'none', border: 'none', color: '#ccc', fontSize: 11, cursor: 'pointer', padding: 0 }}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6, wordBreak: 'break-word' }}>
                  {comment.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import Avatar from './Avatar'
import { timeAgo, getUserInfo } from '../utils/helpers'

export default function CommentSection({ activityId }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { fetchComments() }, [activityId])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true })

    if (data) {
      const withProfiles = await Promise.all(
        data.map(async c => {
          const info = await getUserInfo(c.user_id)
          return { ...c, nickname: info.nickname, avatar_url: info.avatar_url }
        })
      )
      setComments(withProfiles)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)

    const { error } = await supabase.from('comments').insert({
      activity_id: activityId,
      user_id: user.id,
      content: content.trim(),
    })

    if (!error) {
      setContent('')
      fetchComments()
    }
    setSubmitting(false)
  }

  const handleDelete = async (commentId) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (!error) setComments(prev => prev.filter(c => c.id !== commentId))
  }

  return (
    <div className="card">
      <div style={{ fontSize: 11, color: '#bbb', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        讨论 ({comments.length})
      </div>

      {/* 评论输入框 */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Avatar src={user?.id ? '' : undefined} nickname="" size={32} />
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            className="input"
            placeholder="说点什么..."
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ paddingRight: 60, fontSize: 14, padding: '10px 60px 10px 14px' }}
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: content.trim() ? 'var(--accent)' : '#ddd',
              color: '#fff', border: 'none', borderRadius: 16,
              padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            发送
          </button>
        </div>
      </form>

      {/* 评论列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#bbb', fontSize: 13 }}>加载评论...</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#ddd', fontSize: 13 }}>还没有评论，来说两句吧</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10 }}>
              <Avatar src={c.avatar_url} nickname={c.nickname} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{c.nickname}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#ccc' }}>{timeAgo(c.created_at)}</span>
                    {c.user_id === user?.id && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        style={{ background: 'none', border: 'none', color: '#ccc', fontSize: 11, cursor: 'pointer', padding: 0 }}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6, wordBreak: 'break-word' }}>
                  {c.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

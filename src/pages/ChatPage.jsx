import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'

export default function ChatPage() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [isFriend, setIsFriend] = useState(false)
  const [chatUser, setChatUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (user?.id === userId) {
      navigate('/messages')
      return
    }
    initChat()
  }, [userId])

  const initChat = async () => {
    setLoading(true)

    // 获取对方昵称
    const { data: prof } = await supabase
      .from('profiles')
      .select('nickname, avatar_url')
      .eq('id', userId)
      .single()
    setChatUser({ id: userId, nickname: prof?.nickname || ('用户' + userId.slice(0, 6)), avatar_url: prof?.avatar_url || '' })

    // 查好友关系
    const { data: f1 } = await supabase
      .from('friendships')
      .select('status')
      .eq('from_user_id', user.id)
      .eq('to_user_id', userId)
      .eq('status', 'accepted')
      .single()
    const { data: f2 } = !f1 ? await supabase
      .from('friendships')
      .select('status')
      .eq('from_user_id', userId)
      .eq('to_user_id', user.id)
      .eq('status', 'accepted')
      .single() : {}
    setIsFriend(!!(f1 || f2))

    // 获取消息历史
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })

    setMessages(data || [])
    setLoading(false)

    // 滚动到底部
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // 计算消息总数（非好友时用于限制）
  const msgCount = messages.length
  const limitReached = !isFriend && msgCount >= 5

  const handleSend = async () => {
    const text = newMsg.trim()
    if (!text || sending) return

    if (limitReached) {
      alert('非好友最多只能发送5条消息，请先加为好友')
      return
    }

    setSending(true)
    const { error } = await supabase
      .from('messages')
      .insert({ sender_id: user.id, receiver_id: userId, content: text })

    if (!error) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender_id: user.id,
        receiver_id: userId,
        content: text,
        created_at: new Date().toISOString(),
      }])
      setNewMsg('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } else {
      alert('发送失败：' + error.message)
    }
    setSending(false)
  }

  const formatTime = (t) => {
    const d = new Date(t)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5' }}>
      {/* 顶栏 */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#1a1a1a', padding: 4 }}
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        {chatUser?.avatar_url ? (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `url(${chatUser.avatar_url}) center/cover no-repeat`,
          }} />
        ) : null}
        <span style={{ fontWeight: 700, fontSize: 17 }}>{chatUser?.nickname}</span>
        {!isFriend && (
          <span style={{ fontSize: 12, color: '#f59e0b', background: '#fffbeb', padding: '2px 8px', borderRadius: 8 }}>
            非好友
          </span>
        )}
      </div>

      {/* 非好友提示 */}
      {!isFriend && msgCount === 0 && (
        <div style={{
          textAlign: 'center', padding: '12px 16px', fontSize: 12, color: '#999',
          background: '#fafafa', borderBottom: '1px solid #f0f0f0',
        }}>
          非好友最多可发送 5 条消息，加为好友即可无限畅聊
        </div>
      )}

      {/* 消息列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#ccc', fontSize: 14 }}>
            开始你们的对话吧
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isMine = msg.sender_id === user.id
              // 在第5条消息后（非好友）插入提示
              const showLimitHint = !isFriend && idx === 4 && msgCount >= 5

              return (
                <div key={msg.id}>
                  <div style={{
                    display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
                    marginBottom: 8,
                  }}>
                    <div style={{
                      maxWidth: '75%', padding: '10px 14px',
                      borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMine ? '#1a1a1a' : '#fff',
                      color: isMine ? '#fff' : '#1a1a1a',
                      fontSize: 15, lineHeight: 1.5,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                  <div style={{
                    textAlign: isMine ? 'right' : 'left',
                    fontSize: 11, color: '#ccc', marginBottom: 12,
                    paddingLeft: isMine ? 0 : 4, paddingRight: isMine ? 4 : 0,
                  }}>
                    {formatTime(msg.created_at)}
                  </div>

                  {showLimitHint && (
                    <div style={{
                      textAlign: 'center', margin: '12px 0', fontSize: 13, color: '#f59e0b',
                    }}>
                      已达非好友消息上限(5条)，加为好友即可继续聊天
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* 输入框 */}
      <div style={{
        background: '#fff', borderTop: '1px solid #f0f0f0',
        padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center',
        position: 'sticky', bottom: 0,
      }}>
        <input
          className="input"
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          placeholder={limitReached ? '已达上限，请先加为好友' : '输入消息...'}
          disabled={limitReached}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <button
          className="btn-primary"
          style={{
            width: 'auto', padding: '10px 18px', fontSize: 14,
            flexShrink: 0, marginBottom: 0,
          }}
          disabled={!newMsg.trim() || limitReached || sending}
          onClick={handleSend}
        >
          发送
        </button>
      </div>
    </div>
  )
}

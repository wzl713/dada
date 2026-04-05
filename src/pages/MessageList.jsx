import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import Navbar from '../components/Navbar'

export default function MessageList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchChats() }, [])

  const fetchChats = async () => {
    // 获取所有和当前用户相关的消息，按对方分组，取最后一条
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!data || data.length === 0) {
      setLoading(false)
      return
    }

    // 按对方分组，取每组最新的一条
    const chatMap = new Map()
    for (const msg of data) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      if (!chatMap.has(otherId)) {
        chatMap.set(otherId, msg)
      }
    }

    // 获取每个对方的昵称
    const chatList = await Promise.all(
      Array.from(chatMap.entries()).map(async ([otherId, lastMsg]) => {
        const { data: prof } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', otherId)
          .single()
        return {
          userId: otherId,
          nickname: prof?.nickname || ('用户' + otherId.slice(0, 6)),
          avatar_url: prof?.avatar_url || '',
          lastMessage: lastMsg.content,
          lastTime: lastMsg.created_at,
        }
      })
    )

    // 按最后消息时间排序
    chatList.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
    setChats(chatList)
    setLoading(false)
  }

  const formatTime = (t) => {
    const d = new Date(t)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const hour = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')
    if (isToday) return `${hour}:${min}`
    return `${d.getMonth() + 1}/${d.getDate()} ${hour}:${min}`
  }

  return (
    <div>
      <Navbar title="私信" />

      <div className="container" style={{ paddingTop: 0, paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
        ) : chats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p>还没有私信</p>
          </div>
        ) : (
          chats.map(chat => (
            <div
              key={chat.userId}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 4', borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/messages/${chat.userId}`)}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: chat.avatar_url
                  ? `url(${chat.avatar_url}) center/cover no-repeat`
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 600, flexShrink: 0,
              }}>
                {!chat.avatar_url && chat.nickname.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{chat.nickname}</span>
                  <span style={{ fontSize: 12, color: '#bbb', flexShrink: 0 }}>{formatTime(chat.lastTime)}</span>
                </div>
                <div style={{
                  fontSize: 13, color: '#999', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {chat.lastMessage}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

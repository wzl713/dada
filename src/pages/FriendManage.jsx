import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import Navbar from '../components/Navbar'

export default function FriendManage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pendingReceived, setPendingReceived] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)

    // 待处理的好友申请（别人发给我的）
    const { data: received } = await supabase
      .from('friendships')
      .select('id, from_user_id, to_user_id, status, created_at')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // 我的好友（双向查）
    const { data: sentAccepted } = await supabase
      .from('friendships')
      .select('id, from_user_id, to_user_id')
      .eq('from_user_id', user.id)
      .eq('status', 'accepted')

    const { data: recvAccepted } = await supabase
      .from('friendships')
      .select('id, from_user_id, to_user_id')
      .eq('to_user_id', user.id)
      .eq('status', 'accepted')

    // 合并好友 ID
    const friendIds = new Set()
    ;(sentAccepted || []).forEach(f => {
      const fid = f.from_user_id === user.id ? f.to_user_id : f.from_user_id
      friendIds.add(fid)
    })
    ;(recvAccepted || []).forEach(f => {
      const fid = f.from_user_id === user.id ? f.to_user_id : f.from_user_id
      friendIds.add(fid)
    })

    // 获取昵称
    const fetchNickname = async (uid) => {
      const { data } = await supabase.from('profiles').select('nickname, avatar_url').eq('id', uid).single()
      return {
        nickname: data?.nickname || ('用户' + uid.slice(0, 6)),
        avatar_url: data?.avatar_url || '',
      }
    }

    const receivedWithNames = await Promise.all(
      (received || []).map(async r => {
        const info = await fetchNickname(r.from_user_id)
        return {
          ...r,
          nickname: info.nickname,
          avatar_url: info.avatar_url,
          userId: r.from_user_id,
        }
      })
    )

    const friendsWithNames = await Promise.all(
      Array.from(friendIds).map(async fid => {
        const info = await fetchNickname(fid)
        return {
          id: fid,
          nickname: info.nickname,
          avatar_url: info.avatar_url,
        }
      })
    )

    setPendingReceived(receivedWithNames)
    setFriends(friendsWithNames)
    setLoading(false)
  }

  const handleAccept = async (id, fromUserId) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id)
    fetchData()
  }

  const handleReject = async (id) => {
    await supabase
      .from('friendships')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
    fetchData()
  }

  if (loading) {
    return (
      <div>
        <Navbar title="好友管理" />
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div>
      <Navbar title="好友管理" />

      <div className="container" style={{ paddingTop: 16, paddingBottom: 80 }}>
        {/* 好友申请 */}
        <div style={{ fontSize: 14, fontWeight: 600, color: '#999', marginBottom: 8, paddingLeft: 4 }}>
          好友申请 {pendingReceived.length > 0 && `(${pendingReceived.length})`}
        </div>
        {pendingReceived.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#ccc', padding: 24 }}>
            没有新的好友申请
          </div>
        ) : (
          pendingReceived.map(req => (
            <div key={req.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: req.avatar_url
                    ? `url(${req.avatar_url}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 600, flexShrink: 0, cursor: 'pointer',
                }}
                onClick={() => navigate(`/user/${req.userId}`)}
              >
                {!req.avatar_url && req.nickname.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                  onClick={() => navigate(`/user/${req.userId}`)}
                >
                  {req.nickname}
                </div>
                <div style={{ fontSize: 12, color: '#bbb' }}>
                  请求添加你为好友
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-primary"
                  style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}
                  onClick={() => handleAccept(req.id, req.userId)}
                >
                  同意
                </button>
                <button
                  className="btn-outline"
                  style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}
                  onClick={() => handleReject(req.id)}
                >
                  拒绝
                </button>
              </div>
            </div>
          ))
        )}

        {/* 好友列表 */}
        <div style={{ fontSize: 14, fontWeight: 600, color: '#999', marginBottom: 8, marginTop: 24, paddingLeft: 4 }}>
          我的好友 ({friends.length})
        </div>
        {friends.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#ccc', padding: 24 }}>
            还没有好友
          </div>
        ) : (
          friends.map(f => (
            <div key={f.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: f.avatar_url
                    ? `url(${f.avatar_url}) center/cover no-repeat`
                    : '#e8e8e8',
                  color: '#666',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 600, flexShrink: 0, cursor: 'pointer',
                }}
                onClick={() => navigate(`/user/${f.id}`)}
              >
                {!f.avatar_url && f.nickname.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, cursor: 'pointer' }}
                onClick={() => navigate(`/user/${f.id}`)}
              >
                <span style={{ fontWeight: 600, fontSize: 15 }}>{f.nickname}</span>
              </div>
              <button
                style={{
                  background: 'none', border: '1px solid #ddd', borderRadius: 8,
                  padding: '6px 14px', fontSize: 13, color: '#666', cursor: 'pointer',
                }}
                onClick={() => navigate(`/messages/${f.id}`)}
              >
                💬
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

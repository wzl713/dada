import { useState } from 'react'
import { useToast } from './Toast'

export default function ShareButton({ activity }) {
  const toast = useToast()
  const [showMenu, setShowMenu] = useState(false)

  const shareData = {
    title: activity.title,
    text: `${activity.title} · ${new Date(activity.start_time).getMonth() + 1}月${new Date(activity.start_time).getDate()}日 · ${activity.location}`,
    url: window.location.origin + '/activity/' + activity.id,
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (e) {
        // 用户取消分享，不做处理
      }
    } else {
      handleCopyLink()
    }
    setShowMenu(false)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url)
      toast.success('链接已复制')
    } catch {
      // fallback
      const input = document.createElement('input')
      input.value = shareData.url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      toast.success('链接已复制')
    }
    setShowMenu(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        onClick={() => setShowMenu(!showMenu)}
      >
        📤 分享
      </button>

      {showMenu && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 }} onClick={() => setShowMenu(false)} />
          <div style={{
            position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
            background: '#fff', borderRadius: 14, padding: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 201,
            minWidth: 140,
          }}>
            {navigator.share && (
              <button
                style={{
                  width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                  textAlign: 'left', fontSize: 14, cursor: 'pointer', borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
                }}
                onClick={handleNativeShare}
              >
                <span>📱</span> 分享到...
              </button>
            )}
            <button
              style={{
                width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                textAlign: 'left', fontSize: 14, cursor: 'pointer', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
              }}
              onClick={handleCopyLink}
            >
              <span>🔗</span> 复制链接
            </button>
          </div>
        </>
      )}
    </div>
  )
}

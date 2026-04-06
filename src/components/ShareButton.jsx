import { useState } from 'react'
import { useToast } from './toast-context'

export default function ShareButton({ activity, label = '分享' }) {
  const toast = useToast()
  const [showMenu, setShowMenu] = useState(false)

  const shareData = {
    title: activity.title,
    text: `${activity.title} · ${new Date(activity.start_time).getMonth() + 1}月${new Date(activity.start_time).getDate()}日 · ${activity.location}`,
    url: `${window.location.origin}/activity/${activity.id}`,
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // 用户取消分享时不提示
      }
    } else {
      await handleCopyLink()
    }
    setShowMenu(false)
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareData.url)
      toast.success('链接已复制')
    } catch {
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
        type="button"
        className="btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        onClick={() => setShowMenu((prev) => !prev)}
      >
        📤 {label}
      </button>

      {showMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setShowMenu(false)} />
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: 8,
              background: '#fff',
              borderRadius: 14,
              padding: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 201,
              minWidth: 140,
            }}
          >
            {navigator.share && (
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: 14,
                  cursor: 'pointer',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontFamily: 'inherit',
                }}
                onClick={handleNativeShare}
              >
                <span>📱</span> 分享到...
              </button>
            )}
            <button
              type="button"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: 'inherit',
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

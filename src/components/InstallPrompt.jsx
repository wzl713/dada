import { useEffect, useState } from 'react'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIosHint] = useState(() => {
    if (typeof window === 'undefined') return false
    if (isStandalone()) return false
    if (localStorage.getItem('dada-install-dismissed') === '1') return false

    const ua = window.navigator.userAgent.toLowerCase()
    const isIos = /iphone|ipad|ipod/.test(ua)
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua)
    return isIos && isSafari
  })
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('dada-install-dismissed') === '1'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) return
    if (dismissed) return

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [dismissed])

  function handleDismiss() {
    setDismissed(true)
    setDeferredPrompt(null)
    localStorage.setItem('dada-install-dismissed', '1')
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (dismissed || isStandalone()) return null
  if (!deferredPrompt && !showIosHint) return null

  return (
    <div className="install-prompt">
      <div style={{ flex: 1 }}>
        <div className="install-prompt-title">安装搭搭到手机桌面</div>
        <div className="install-prompt-desc">
          {deferredPrompt
            ? '安装后打开更像 App，方便你直接发给测试用户使用。'
            : 'iPhone 用户点浏览器的分享按钮，再选“添加到主屏幕”。'}
        </div>
      </div>
      {deferredPrompt && (
        <button type="button" className="install-prompt-btn" onClick={handleInstall}>
          安装
        </button>
      )}
      <button type="button" className="install-prompt-close" onClick={handleDismiss}>
        稍后
      </button>
    </div>
  )
}

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, type = 'default', duration = 2500) => {
    setToast({ message, type, exiting: false })
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, exiting: true } : null)
      setTimeout(() => setToast(null), 200)
    }, duration)
  }, [])

  const success = useCallback((msg) => show(msg, 'success'), [show])
  const error = useCallback((msg) => show(msg, 'error'), [show])

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      {children}
      {toast && (
        <div className={`toast${toast.type !== 'default' ? ` toast-${toast.type}` : ''}${toast.exiting ? ' toast-exit' : ''}`}>
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

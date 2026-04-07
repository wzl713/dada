import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { AuthContext, useAuth } from './auth'

import LoginPage from './pages/LoginPage'
import ActivityList from './pages/ActivityList'
import CreateActivity from './pages/CreateActivity'
import ProfilePage from './pages/ProfilePage'
import ActivityDetail from './pages/ActivityDetail'
import UserProfile from './pages/UserProfile'
import EditActivity from './pages/EditActivity'
import Notifications from './pages/Notifications'
import LegalPage from './pages/LegalPage'
import TabBar from './components/TabBar'
import InstallPrompt from './components/InstallPrompt'
import { ToastProvider } from './components/Toast'
import ComplianceFooter from './components/ComplianceFooter'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

// 需要显示 TabBar 的路由
const TAB_ROUTES = ['/', '/notifications', '/create', '/profile']

function AppContent() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const showTabBar = user && TAB_ROUTES.some(r => location.pathname === r || (r !== '/' && location.pathname.startsWith(r)))
  const showComplianceFooter = user && location.pathname !== '/login'

  const ensureProfile = async (user) => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('id', user.id)
      .single()
    const defaultNickname = user.email?.split('@')[0] || '新用户'
    if (!data) {
      await supabase.from('profiles').insert({ id: user.id, nickname: defaultNickname })
    } else if (!data.nickname) {
      await supabase.from('profiles').update({ nickname: defaultNickname }).eq('id', user.id)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      setLoading(false)
      if (u) ensureProfile(u)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) ensureProfile(u)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  return (
    <AuthContext.Provider value={{ user }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/legal/:type" element={<LegalPage />} />
        <Route path="/" element={<ProtectedRoute><ActivityList /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateActivity /></ProtectedRoute>} />
        <Route path="/activity/:id" element={<ProtectedRoute><ActivityDetail /></ProtectedRoute>} />
        <Route path="/edit/:id" element={<ProtectedRoute><EditActivity /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/user/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showComplianceFooter && <ComplianceFooter />}
      <InstallPrompt />
      {showTabBar && <TabBar />}
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ToastProvider>
  )
}

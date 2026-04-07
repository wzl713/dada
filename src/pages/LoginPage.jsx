import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../components/toast-context'
import { DuckMascot, LineIcon } from '../components/DadaIcons'

export default function LoginPage() {
  const [mode, setMode] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const navigate = useNavigate()
  const toast = useToast()

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) setMessage(error.message)
      else { toast.success('注册成功！请查收邮件确认'); setMessage('注册成功！请查收邮件确认账号后登录。') }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else navigate('/')
    }
    setLoading(false)
  }

  const handleSendOtp = async () => {
    if (!phone || phone.length < 11) { setMessage('请输入正确的手机号'); return }
    setLoading(true); setMessage('')
    const { error } = await supabase.auth.signInWithOtp({ phone: phone.startsWith('+') ? phone : `+86${phone}` })
    if (error) setMessage('发送失败：' + error.message)
    else {
      setOtpSent(true); setMessage('验证码已发送')
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0 } return prev - 1 })
      }, 1000)
    }
    setLoading(false)
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp || otp.length < 6) { setMessage('请输入6位验证码'); return }
    setLoading(true); setMessage('')
    const { data, error } = await supabase.auth.verifyOtp({ phone: phone.startsWith('+') ? phone : `+86${phone}`, token: otp, type: 'sms' })
    if (error) setMessage('验证失败：' + error.message)
    else if (data.session) navigate('/')
    setLoading(false)
  }

  const handleWechatLogin = async () => {
    setLoading(true); setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'wechat', options: { redirectTo: window.location.origin } })
    if (error) { setMessage('微信登录暂不可用'); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', padding: '24px',
      background: 'linear-gradient(180deg, #fff8e7 0%, #fff2f5 52%, #fff 100%)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #fff3bf 0%, #ffd6df 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 26px rgba(245, 177, 66, 0.24)',
          }}>
            <DuckMascot size={54} mood="happy" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>搭搭 Dada</h1>
          <p style={{ color: '#aaa', marginTop: 6, fontSize: 14, fontWeight: 500 }}>快速找到一起做事的人</p>
        </div>

        {/* 登录方式切换 */}
        <div style={{
          display: 'flex', background: '#eee', borderRadius: 14, padding: 4, marginBottom: 28,
        }}>
          {['email', 'phone'].map(m => (
            <button key={m}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#1a1a1a' : '#999',
                boxShadow: mode === m ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              }}
              onClick={() => { setMode(m); setMessage('') }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <LineIcon name={m === 'email' ? 'mail' : 'phone'} size={16} />
                {m === 'email' ? '邮箱登录' : '手机号登录'}
              </span>
            </button>
          ))}
        </div>

        {/* 邮箱表单 */}
        {mode === 'email' && (
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input" type="email" placeholder="邮箱地址" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="input" type="password" placeholder="密码（至少6位）" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            {message && (
              <p style={{ fontSize: 13, color: message.includes('成功') || message.includes('已发送') ? 'var(--success)' : 'var(--danger)', textAlign: 'center' }}>
                {message}
              </p>
            )}
            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? '请稍候...' : isSignUp ? '注册' : '登录'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 14, color: '#888' }}>
              {isSignUp ? '已有账号？' : '还没有账号？'}
              <button onClick={() => { setIsSignUp(!isSignUp); setMessage('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600,
                color: 'var(--accent)', fontSize: 14, fontFamily: 'inherit',
              }} type="button">
                {isSignUp ? '去登录' : '去注册'}
              </button>
            </p>
          </form>
        )}

        {/* 手机号表单 */}
        {mode === 'phone' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" type="tel" placeholder="手机号" value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                disabled={otpSent} style={{ flex: 1 }} required />
              {!otpSent ? (
                <button type="button" className="btn-outline" style={{ width: 'auto', padding: '10px 16px', fontSize: 14, whiteSpace: 'nowrap' }}
                  onClick={handleSendOtp} disabled={loading}>{loading ? '发送中...' : '获取验证码'}</button>
              ) : (
                <button type="button" className="btn-outline" style={{ width: 'auto', padding: '10px 16px', fontSize: 14, whiteSpace: 'nowrap', opacity: countdown > 0 ? 0.5 : 1 }}
                  disabled={countdown > 0 || loading} onClick={handleSendOtp}>{countdown > 0 ? `${countdown}s` : '重新获取'}</button>
              )}
            </div>
            {otpSent && (
              <input className="input" type="text" placeholder="6位验证码" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} autoFocus required />
            )}
            {message && (
              <p style={{ fontSize: 13, color: message.includes('成功') || message.includes('已发送') ? 'var(--success)' : 'var(--danger)', textAlign: 'center' }}>
                {message}
              </p>
            )}
            {otpSent && (
              <>
                <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>{loading ? '验证中...' : '验证登录'}</button>
                <button type="button" style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => { setOtpSent(false); setOtp(''); setMessage('') }}>更换手机号</button>
              </>
            )}
          </form>
        )}

        {/* 分隔线 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
          <span style={{ fontSize: 12, color: '#ccc' }}>其他登录方式</span>
          <div style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
        </div>

        {/* 微信登录 */}
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 0', border: '1.5px solid #e8e8e8', borderRadius: 14,
          fontSize: 15, fontWeight: 600, cursor: 'pointer', background: '#fff',
          transition: 'all 0.2s ease', fontFamily: 'inherit', color: '#333',
        }} onClick={handleWechatLogin} disabled={loading}>
          <span style={{ fontSize: 20, color: '#22c55e' }}>●</span>
          微信登录
        </button>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#ccc', lineHeight: 1.7 }}>
          登录即表示同意搭搭的
          <Link to="/legal/terms" style={{ color: 'var(--accent)', textDecoration: 'none', margin: '0 4px' }}>用户协议</Link>
          和
          <Link to="/legal/privacy" style={{ color: 'var(--accent)', textDecoration: 'none', marginLeft: 4 }}>隐私政策</Link>
        </p>
      </div>
    </div>
  )
}

export default function Avatar({ src, nickname, size = 40 }) {
  if (src) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `url(${src}) center/cover no-repeat`,
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
      }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, flexShrink: 0,
    }}>
      {(nickname || '?').charAt(0).toUpperCase()}
    </div>
  )
}

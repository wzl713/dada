// 骨架屏组件集合

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-line" style={{ width: '70%', height: 18, marginBottom: 12 }} />
      <div className="skeleton skeleton-line skeleton-line-medium" />
      <div className="skeleton skeleton-line skeleton-line-short" />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, alignItems: 'center' }}>
        <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 12 }} />
        <div className="skeleton" style={{ width: 60, height: 32, borderRadius: 8 }} />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  )
}

export function SkeletonDetail() {
  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 100 }}>
      <div className="skeleton-card">
        <div className="skeleton" style={{ width: '80%', height: 22, marginBottom: 16 }} />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line skeleton-line-medium" />
      </div>
      <div className="skeleton-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="skeleton skeleton-avatar" />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-line" style={{ width: 100 }} />
            <div className="skeleton skeleton-line skeleton-line-short" style={{ marginTop: 8 }} />
          </div>
        </div>
      </div>
      <div className="skeleton-card">
        <div className="skeleton" style={{ width: 60, height: 14, marginBottom: 12 }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="skeleton skeleton-circle" style={{ width: 32, height: 32, flexShrink: 0 }} />
            <div className="skeleton skeleton-line" style={{ width: 80 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonProfile() {
  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 80 }}>
      <div className="skeleton-card" style={{ textAlign: 'center', padding: 32 }}>
        <div className="skeleton skeleton-circle" style={{ width: 72, height: 72, margin: '0 auto 16px' }} />
        <div className="skeleton skeleton-line" style={{ width: 120, margin: '0 auto 8px' }} />
        <div className="skeleton skeleton-line skeleton-line-short" style={{ width: 160, margin: '0 auto' }} />
      </div>
      <div className="skeleton-card" style={{ padding: 0, overflow: 'hidden' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="profile-menu-item">
            <div className="skeleton skeleton-line" style={{ width: 80 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonMessages() {
  return (
    <div className="container" style={{ paddingTop: 12, paddingBottom: 80 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="skeleton skeleton-avatar" />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-line" style={{ width: '50%', marginBottom: 6 }} />
            <div className="skeleton skeleton-line skeleton-line-short" />
          </div>
          <div className="skeleton" style={{ width: 40, height: 14 }} />
        </div>
      ))}
    </div>
  )
}

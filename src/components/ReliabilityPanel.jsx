import { CreditDuckBadge } from './DadaIcons'

function getDisplayCreditScore(summary) {
  return Number.isFinite(Number(summary?.creditScore)) ? Number(summary.creditScore) : 5
}

function getAttendanceTotal(summary, profile) {
  return (summary?.completedCount || 0)
    + (summary?.missedConfirmCount || 0)
    + (summary?.noShowCount || 0)
    + (profile?.no_show_count || 0)
}

function StatBlock({ label, value, color = '#333', hint }) {
  return (
    <div style={{ flex: 1, minWidth: 86, background: '#fffaf0', borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9c7a43', marginTop: 5, fontWeight: 700 }}>{label}</div>
      {hint && <div style={{ fontSize: 10, color: '#c4a878', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

export default function ReliabilityPanel({ title = '靠谱度', summary, profile = {} }) {
  const creditScore = getDisplayCreditScore(summary)
  const attendedCount = summary?.participatedCount ?? profile.attended_count ?? 0
  const attendanceTotal = getAttendanceTotal(summary, profile)
  const hasPunctualData = (summary?.punctualSampleCount || attendanceTotal) > 0
  const punctualRate = hasPunctualData
    ? (summary?.punctualSampleCount ? summary.punctualRate : Number(profile.completion_rate || 0))
    : null
  const reliabilityValue = summary?.participatedCount || summary?.reviewCount ? summary.reliabilityScore : '暂无'
  const progressWidth = punctualRate === null ? 0 : Math.max(0, Math.min(100, punctualRate))

  return (
    <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #fffefa 0%, #fff0f4 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: '#c19a53', marginBottom: 4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: '#8b6b39' }}>
            信用分默认 5 分，会随完成活动和爽约记录变化。
          </div>
        </div>
        <CreditDuckBadge levelKey={summary?.creditLevelKey} label={summary?.creditLevelLabel || profile.credit_level || '新用户'} />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <StatBlock label="信用分" value={creditScore} color={creditScore >= 5 ? 'var(--accent)' : '#ef4444'} />
        <StatBlock label="守约率" value={punctualRate === null ? '暂无' : `${Math.round(punctualRate)}%`} color={punctualRate === null ? '#b7a58a' : '#22c55e'} hint={punctualRate === null ? '完成后显示' : '基于已到期活动'} />
        <StatBlock label="已参加" value={attendedCount} color="#333" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9c7a43', marginBottom: 6 }}>
          <span>守约进度</span>
          <span>{punctualRate === null ? '暂无记录' : `${Math.round(punctualRate)}%`}</span>
        </div>
        <div style={{ height: 8, background: '#f5e8c9', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              width: `${progressWidth}%`,
              height: '100%',
              borderRadius: 999,
              background: progressWidth >= 80 ? '#22c55e' : progressWidth >= 50 ? '#f59e0b' : '#ef4444',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="tag">靠谱度 {reliabilityValue}</span>
        <span className="tag">放鸽子 {summary?.noShowCount ?? profile.no_show_count ?? 0} 次</span>
        {summary?.creditLevelKey === 'newbie' && <span className="tag">新人一次只能报 1 个未结束活动</span>}
        {summary?.canCreateActivity === false && <span className="tag tag-danger">暂时不能发起活动</span>}
        {summary?.topTags?.length ? (
          summary.topTags.map((tag) => <span key={tag} className="tag tag-accent">{tag}</span>)
        ) : (
          <span style={{ fontSize: 13, color: '#9c7a43' }}>活动通过确认和互评后，会慢慢形成更完整的靠谱度。</span>
        )}
      </div>
    </div>
  )
}

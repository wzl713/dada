const iconStyle = {
  width: '1em',
  height: '1em',
  display: 'inline-block',
  verticalAlign: '-0.14em',
}

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function LineIcon({ name, size = 18, style }) {
  const common = {
    viewBox: '0 0 24 24',
    style: { ...iconStyle, width: size, height: size, ...style },
    'aria-hidden': true,
  }

  const icons = {
    home: (
      <svg {...common}><path {...strokeProps} d="M4 11.2 12 4l8 7.2" /><path {...strokeProps} d="M6.5 10.5V20h11v-9.5" /><path {...strokeProps} d="M9.5 20v-5h5v5" /></svg>
    ),
    bell: (
      <svg {...common}><path {...strokeProps} d="M18 9.5a6 6 0 0 0-12 0c0 5-2 5.5-2 7h16c0-1.5-2-2-2-7Z" /><path {...strokeProps} d="M9.8 19a2.4 2.4 0 0 0 4.4 0" /></svg>
    ),
    plus: (
      <svg {...common}><path {...strokeProps} d="M12 5v14M5 12h14" /></svg>
    ),
    user: (
      <svg {...common}><path {...strokeProps} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path {...strokeProps} d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>
    ),
    search: (
      <svg {...common}><circle {...strokeProps} cx="10.5" cy="10.5" r="6" /><path {...strokeProps} d="m15 15 4.5 4.5" /></svg>
    ),
    clock: (
      <svg {...common}><circle {...strokeProps} cx="12" cy="12" r="8" /><path {...strokeProps} d="M12 7.5V12l3 2" /></svg>
    ),
    location: (
      <svg {...common}><path {...strokeProps} d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" /><circle {...strokeProps} cx="12" cy="10" r="2.5" /></svg>
    ),
    users: (
      <svg {...common}><path {...strokeProps} d="M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path {...strokeProps} d="M3.5 20a6 6 0 0 1 12 0" /><path {...strokeProps} d="M17 10.5a3 3 0 0 0 0-5.8" /><path {...strokeProps} d="M17.5 17.5a5 5 0 0 1 3 2.5" /></svg>
    ),
    tag: (
      <svg {...common}><path {...strokeProps} d="M4 5.5V12l7.5 7.5 7-7L11 5H4Z" /><circle {...strokeProps} cx="8" cy="9" r="1" /></svg>
    ),
    spark: (
      <svg {...common}><path {...strokeProps} d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3Z" /></svg>
    ),
    mail: (
      <svg {...common}><path {...strokeProps} d="M4 6h16v12H4z" /><path {...strokeProps} d="m4 7 8 6 8-6" /></svg>
    ),
    phone: (
      <svg {...common}><path {...strokeProps} d="M8 3h8v18H8z" /><path {...strokeProps} d="M11 18h2" /></svg>
    ),
    camera: (
      <svg {...common}><path {...strokeProps} d="M5 8h3l1.2-2h5.6L16 8h3v10H5z" /><circle {...strokeProps} cx="12" cy="13" r="3" /></svg>
    ),
    movie: (
      <svg {...common}><path {...strokeProps} d="M5 6h14v12H5z" /><path {...strokeProps} d="M8 6v12M16 6v12M5 10h14M5 14h14" /></svg>
    ),
    food: (
      <svg {...common}><path {...strokeProps} d="M6 4v8M9 4v8M6 8h3M17 4v16M14.5 4v6.5a2.5 2.5 0 0 0 2.5 2.5" /></svg>
    ),
    sport: (
      <svg {...common}><circle {...strokeProps} cx="9" cy="9" r="5" /><path {...strokeProps} d="m13 13 6 6M6 6c2.5 1 4.5 3 5.5 5.5" /></svg>
    ),
    book: (
      <svg {...common}><path {...strokeProps} d="M5 5.5h5.5A3.5 3.5 0 0 1 14 9v10a3.5 3.5 0 0 0-3.5-3.5H5z" /><path {...strokeProps} d="M19 5.5h-5.5A3.5 3.5 0 0 0 10 9v10a3.5 3.5 0 0 1 3.5-3.5H19z" /></svg>
    ),
    hike: (
      <svg {...common}><path {...strokeProps} d="M13 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /><path {...strokeProps} d="m11 9-2 4 3 2 2 5" /><path {...strokeProps} d="m14 10 3 3M9 13l-3 7" /></svg>
    ),
    gallery: (
      <svg {...common}><path {...strokeProps} d="M5 5h14v14H5z" /><path {...strokeProps} d="m7 16 3.5-4 2.5 3 2-2.2 2 3.2" /><circle {...strokeProps} cx="15.5" cy="8.5" r="1" /></svg>
    ),
    link: (
      <svg {...common}><path {...strokeProps} d="M10 13a4 4 0 0 0 5.7 0l2-2a4 4 0 0 0-5.7-5.7l-1 1" /><path {...strokeProps} d="M14 11a4 4 0 0 0-5.7 0l-2 2A4 4 0 0 0 12 18.7l1-1" /></svg>
    ),
  }

  return icons[name] || icons.tag
}

export function DuckMascot({ size = 48, mood = 'happy', style }) {
  const eyeY = mood === 'sleepy' ? 31 : 30
  const beakY = mood === 'proud' ? 38 : 39

  return (
    <svg
      viewBox="0 0 64 64"
      style={{ ...iconStyle, width: size, height: size, ...style }}
      aria-hidden
    >
      <path d="M27 13c-2-4 0-7 4-9M36 13c1-4 4-6 8-5" fill="none" stroke="#6b4a2b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="33" r="22" fill="#FFE08A" />
      <circle cx="22" cy="29" r="7" fill="#FFF3C4" opacity=".7" />
      <circle cx="42" cy="29" r="7" fill="#FFF3C4" opacity=".7" />
      {mood === 'sleepy' ? (
        <>
          <path d="M22 31c2 2 4 2 6 0M36 31c2 2 4 2 6 0" fill="none" stroke="#3f3426" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="25" cy={eyeY} r="2.6" fill="#3f3426" />
          <circle cx="39" cy={eyeY} r="2.6" fill="#3f3426" />
        </>
      )}
      <path d={`M22 ${beakY}c4-4 16-4 20 0-3 5-17 5-20 0Z`} fill="#FFB86B" stroke="#D98442" strokeWidth="1.5" />
      {mood === 'proud' && <path d="M24 23c3-2 6-2 9 0M37 23c2-2 5-2 8 0" fill="none" stroke="#6b4a2b" strokeWidth="2" strokeLinecap="round" />}
      {mood === 'worried' && <path d="M44 20c2 1 3 3 3 5" fill="none" stroke="#6b4a2b" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  )
}

export function CategoryIcon({ category, size = 18 }) {
  const map = {
    电影: 'movie',
    吃饭: 'food',
    运动: 'sport',
    自习: 'book',
    徒步: 'hike',
    展览: 'gallery',
    其他: 'tag',
  }

  return <LineIcon name={map[category] || 'tag'} size={size} />
}

function getCreditLabelText(label) {
  return (label || '新人').replace(/^[^\u4e00-\u9fa5A-Za-z]+/u, '').trim()
}

export function CreditDuckBadge({ levelKey, label, compact = false }) {
  const moodMap = {
    newbie: 'happy',
    regular: 'sleepy',
    high_credit: 'proud',
    quality_creator: 'proud',
    low_credit: 'worried',
  }
  const cleanLabel = getCreditLabelText(label)

  return (
    <span className={`credit-duck-badge credit-duck-badge-${levelKey || 'newbie'}`}>
      <DuckMascot size={compact ? 18 : 22} mood={moodMap[levelKey] || 'happy'} />
      <span>{cleanLabel}</span>
    </span>
  )
}

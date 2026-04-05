import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import Navbar from '../components/Navbar'
import ActivityCard from '../components/ActivityCard'
import { SkeletonList } from '../components/Skeleton'

const CATEGORIES = [
  { value: '', label: '全部类型' },
  { value: '运动', label: '🏃 运动' },
  { value: '学习', label: '📚 学习' },
  { value: '美食', label: '🍜 美食' },
  { value: '游戏', label: '🎮 游戏' },
  { value: '户外', label: '🏔️ 户外' },
  { value: '娱乐', label: '🎵 娱乐' },
  { value: '社交', label: '🤝 社交' },
  { value: '其他', label: '📌 其他' },
]

const TIME_FILTERS = [
  { value: '', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
]

export default function ActivityList() {
  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [myJoined, setMyJoined] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [timeFilter, setTimeFilter] = useState('')
  const [location, setLocation] = useState('')
  const debounceTimer = useRef(null)

  const fetchActivities = async (filters = {}) => {
    setLoading(true)
    let query = supabase.from('activities_with_count').select('*')

    if (filters.keyword) {
      const kw = filters.keyword.trim()
      query = query.or(`title.ilike.%${kw}%,description.ilike.%${kw}%,location.ilike.%${kw}%`)
    }
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.location) query = query.ilike('location', `%${filters.location}%`)

    if (filters.timeFilter) {
      const now = new Date()
      const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      switch (filters.timeFilter) {
        case 'today': {
          const eod = new Date(sod.getTime() + 86400000)
          query = query.gte('start_time', sod.toISOString()).lt('start_time', eod.toISOString())
          break
        }
        case 'tomorrow': {
          const t = new Date(sod.getTime() + 86400000)
          const et = new Date(t.getTime() + 86400000)
          query = query.gte('start_time', t.toISOString()).lt('start_time', et.toISOString())
          break
        }
        case 'week': {
          const eow = new Date(sod.getTime() + 7 * 86400000)
          query = query.gte('start_time', sod.toISOString()).lt('start_time', eow.toISOString())
          break
        }
        case 'month': {
          const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
          query = query.gte('start_time', sod.toISOString()).lt('start_time', eom.toISOString())
          break
        }
      }
    }

    const { data } = await query.order('start_time', { ascending: true })

    const now = new Date()
    const sorted = (data || []).sort((a, b) => {
      const aExp = new Date(a.start_time) < now
      const bExp = new Date(b.start_time) < now
      if (aExp !== bExp) return aExp ? 1 : -1
      if (!aExp && !bExp) return new Date(a.start_time) - new Date(b.start_time)
      return new Date(b.start_time) - new Date(a.start_time)
    })

    setActivities(sorted)
    if (user) {
      const { data: joined } = await supabase.from('activity_members').select('activity_id').eq('user_id', user.id)
      setMyJoined((joined || []).map(j => j.activity_id))
    }
    setLoading(false)
  }

  useEffect(() => { fetchActivities() }, [])

  const handleSearch = (value) => {
    setKeyword(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchActivities({ keyword: value, category, timeFilter, location })
    }, 300)
  }

  const handleFilterChange = (field, value) => {
    if (field === 'category') setCategory(value)
    if (field === 'timeFilter') setTimeFilter(value)
    if (field === 'location') setLocation(value)
    fetchActivities({ keyword, category: field === 'category' ? value : category, timeFilter: field === 'timeFilter' ? value : timeFilter, location: field === 'location' ? value : location })
  }

  const clearFilters = () => {
    setKeyword('')
    setCategory('')
    setTimeFilter('')
    setLocation('')
    setShowFilter(false)
    fetchActivities({})
  }

  const hasFilters = keyword || category || timeFilter || location

  const handleJoin = async (activityId) => {
    const { error } = await supabase.from('activity_members').insert({ activity_id: activityId, user_id: user.id })
    if (!error) {
      setMyJoined(prev => [...prev, activityId])
      fetchActivities({ keyword, category, timeFilter, location })
    }
  }

  const handleLeave = async (activityId) => {
    const { error } = await supabase.from('activity_members').delete().match({ activity_id: activityId, user_id: user.id })
    if (!error) {
      setMyJoined(prev => prev.filter(id => id !== activityId))
      fetchActivities({ keyword, category, timeFilter, location })
    }
  }

  const handleDelete = async (activityId) => {
    if (!confirm('确定要删除这个活动吗？所有参与记录也会一并删除。')) return
    const { error } = await supabase.from('activities').delete().eq('id', activityId)
    if (!error) fetchActivities({ keyword, category, timeFilter, location })
  }

  return (
    <div>
      <Navbar title="搭搭" />

      <div className="container" style={{ paddingTop: 12, paddingBottom: 90 }}>
        {/* 搜索栏 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#ccc' }}>🔍</span>
            <input
              className="input"
              placeholder="搜索活动、地点..."
              value={keyword}
              onChange={e => handleSearch(e.target.value)}
              style={{ paddingLeft: 36, background: '#f5f5f5', border: 'none' }}
            />
          </div>
          <button
            style={{
              padding: '10px 14px', background: showFilter ? 'var(--accent)' : '#f5f5f5',
              color: showFilter ? '#fff' : '#888', border: 'none', borderRadius: 12,
              fontSize: 13, cursor: 'pointer', fontWeight: 600, flexShrink: 0,
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 4,
            }}
            onClick={() => setShowFilter(!showFilter)}
          >
            ⚙️ {hasFilters ? '●' : ''}
          </button>
        </div>

        {/* 筛选面板 */}
        {showFilter && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>活动类型</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 13,
                      border: category === c.value ? 'none' : '1.5px solid #e8e8e8',
                      background: category === c.value ? 'var(--accent)' : '#fff',
                      color: category === c.value ? '#fff' : '#666',
                      cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit',
                    }}
                    onClick={() => handleFilterChange('category', c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>时间范围</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TIME_FILTERS.map(t => (
                  <button
                    key={t.value}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 13,
                      border: timeFilter === t.value ? 'none' : '1.5px solid #e8e8e8',
                      background: timeFilter === t.value ? 'var(--accent)' : '#fff',
                      color: timeFilter === t.value ? '#fff' : '#666',
                      cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit',
                    }}
                    onClick={() => handleFilterChange('timeFilter', t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>地点</div>
              <input
                className="input"
                placeholder="输入地点关键词..."
                value={location}
                onChange={e => handleFilterChange('location', e.target.value)}
              />
            </div>

            {hasFilters && (
              <button
                style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  fontSize: 13, cursor: 'pointer', fontWeight: 600, padding: 0, fontFamily: 'inherit',
                }}
                onClick={clearFilters}
              >
                ✕ 清除所有筛选
              </button>
            )}
          </div>
        )}

        {/* 列表内容 */}
        {loading ? (
          <SkeletonList count={4} />
        ) : activities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏕️</div>
            <div className="empty-state-title">
              {hasFilters ? '没有找到匹配的活动' : '还没有活动'}
            </div>
            <div className="empty-state-desc">
              {hasFilters ? '试试调整筛选条件' : '发布一个活动，邀请大家一起参加吧！'}
            </div>
            {hasFilters && (
              <button
                className="btn-ghost"
                style={{ marginTop: 16 }}
                onClick={clearFilters}
              >
                清除筛选
              </button>
            )}
          </div>
        ) : (
          <>
            {hasFilters && (
              <div style={{ fontSize: 12, color: '#bbb', marginBottom: 8, paddingLeft: 4 }}>
                找到 {activities.length} 个活动
              </div>
            )}
            {activities.map(a => (
              <ActivityCard
                key={a.id}
                activity={a}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onDelete={handleDelete}
                isJoined={myJoined.includes(a.id)}
                isFull={a.member_count >= a.max_members}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

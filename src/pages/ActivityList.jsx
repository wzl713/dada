import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import Navbar from '../components/Navbar'
import ActivityCard from '../components/ActivityCard'
import { SkeletonList } from '../components/Skeleton'
import { useToast } from '../components/toast-context'
import { getBlockedUserIds } from '../utils/safety'

const CATEGORIES = [
  { value: '', label: '全部场景' },
  { value: '电影', label: '🎬 电影' },
  { value: '吃饭', label: '🍜 吃饭' },
  { value: '运动', label: '🏸 运动' },
  { value: '自习', label: '📚 自习' },
  { value: '徒步', label: '🥾 徒步' },
  { value: '展览', label: '🖼️ 展览' },
  { value: '其他', label: '🧩 其他' },
]

const TIME_FILTERS = [
  { value: '', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'week', label: '本周' },
]

export default function ActivityList() {
  const { user } = useAuth()
  const toast = useToast()
  const [activities, setActivities] = useState([])
  const [myMemberships, setMyMemberships] = useState({})
  const [loading, setLoading] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [timeFilter, setTimeFilter] = useState('')
  const [location, setLocation] = useState('')
  const debounceTimer = useRef(null)

  const fetchActivities = useCallback(async (filters = {}, options = {}) => {
    const { silent = false } = options
    if (!silent) setLoading(true)

    let query = supabase.from('activities_with_count').select('*')

    if (filters.keyword) {
      const kw = filters.keyword.trim()
      query = query.or(`title.ilike.%${kw}%,description.ilike.%${kw}%,location.ilike.%${kw}%`)
    }

    if (filters.category) query = query.eq('category', filters.category)
    if (filters.location) query = query.ilike('location', `%${filters.location}%`)

    if (filters.timeFilter) {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      if (filters.timeFilter === 'today') {
        const endOfDay = new Date(startOfDay.getTime() + 86400000)
        query = query.gte('start_time', startOfDay.toISOString()).lt('start_time', endOfDay.toISOString())
      }

      if (filters.timeFilter === 'tomorrow') {
        const tomorrow = new Date(startOfDay.getTime() + 86400000)
        const end = new Date(tomorrow.getTime() + 86400000)
        query = query.gte('start_time', tomorrow.toISOString()).lt('start_time', end.toISOString())
      }

      if (filters.timeFilter === 'week') {
        const endOfWeek = new Date(startOfDay.getTime() + 7 * 86400000)
        query = query.gte('start_time', startOfDay.toISOString()).lt('start_time', endOfWeek.toISOString())
      }
    }

    const [{ data }, blockedIds, joinedRows] = await Promise.all([
      query.order('start_time', { ascending: true }),
      getBlockedUserIds(user.id),
      supabase.from('activity_members').select('activity_id, status').eq('user_id', user.id),
    ])

    const blockedSet = new Set(blockedIds)
    const filtered = (data || []).filter((item) => !blockedSet.has(item.creator_id))

    const now = new Date()
    const sorted = filtered.sort((a, b) => {
      const aExpired = new Date(a.start_time) < now
      const bExpired = new Date(b.start_time) < now

      if (aExpired !== bExpired) return aExpired ? 1 : -1
      if (!aExpired && !bExpired) return new Date(a.start_time) - new Date(b.start_time)
      return new Date(b.start_time) - new Date(a.start_time)
    })

    setActivities(sorted)
    setMyMemberships(
      (joinedRows.data || []).reduce((acc, item) => {
        acc[item.activity_id] = item.status || 'pending'
        return acc
      }, {})
    )
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    let active = true

    async function loadInitial() {
      await fetchActivities()
      if (!active) return
    }

    loadInitial()

    return () => {
      active = false
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [fetchActivities])

  function handleSearch(value) {
    setKeyword(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchActivities({ keyword: value, category, timeFilter, location }, { silent: true })
    }, 250)
  }

  function handleFilterChange(field, value) {
    const next = {
      keyword,
      category,
      timeFilter,
      location,
      [field]: value,
    }

    if (field === 'category') setCategory(value)
    if (field === 'timeFilter') setTimeFilter(value)
    if (field === 'location') setLocation(value)

    fetchActivities(next, { silent: true })
  }

  function clearFilters() {
    setKeyword('')
    setCategory('')
    setTimeFilter('')
    setLocation('')
    setShowFilter(false)
    fetchActivities({})
  }

  async function handleJoin(activityId) {
    const { error } = await supabase
      .from('activity_members')
      .insert({ activity_id: activityId, user_id: user.id })

    if (error) {
      toast.error(error.message || '申请失败')
      return
    }

    toast.success('已发送申请，等待发起人确认')
    setMyMemberships((prev) => ({ ...prev, [activityId]: 'pending' }))
    fetchActivities({ keyword, category, timeFilter, location }, { silent: true })
  }

  async function handleLeave(activityId) {
    const { error } = await supabase
      .from('activity_members')
      .delete()
      .match({ activity_id: activityId, user_id: user.id })

    if (error) {
      toast.error('取消失败')
      return
    }

    setMyMemberships((prev) => {
      const next = { ...prev }
      delete next[activityId]
      return next
    })
    fetchActivities({ keyword, category, timeFilter, location }, { silent: true })
  }

  async function handleDelete(activityId) {
    if (!window.confirm('确定要删除这个活动吗？所有报名与讨论记录也会一起删除。')) return

    const { error } = await supabase.from('activities').delete().eq('id', activityId)
    if (error) {
      toast.error('删除失败')
      return
    }

    toast.success('活动已删除')
    fetchActivities({ keyword, category, timeFilter, location })
  }

  const hasFilters = keyword || category || timeFilter || location

  return (
    <div>
      <Navbar title="搭搭" />

      <div className="container" style={{ paddingTop: 12, paddingBottom: 90 }}>
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #121826 0%, #243b53 100%)',
            color: '#fff',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>即时拼局工具</div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.25, marginBottom: 8 }}>
            5分钟内，找到一起出去的人
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.78)' }}>
            不聊很久，直接看附近谁正在组电影、吃饭、运动和周末局。
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 15,
                color: '#ccc',
              }}
            >
              🔍
            </span>
            <input
              className="input"
              placeholder="搜索电影、吃饭、羽毛球..."
              value={keyword}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ paddingLeft: 36, background: '#f5f5f5', border: 'none' }}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilter((prev) => !prev)}
            style={{
              padding: '10px 14px',
              background: showFilter ? 'var(--accent)' : '#f5f5f5',
              color: showFilter ? '#fff' : '#888',
              border: 'none',
              borderRadius: 12,
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            筛选{hasFilters ? ' •' : ''}
          </button>
        </div>

        {showFilter && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 8 }}>
                场景
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleFilterChange('category', item.value)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 13,
                      border: category === item.value ? 'none' : '1.5px solid #e8e8e8',
                      background: category === item.value ? 'var(--accent)' : '#fff',
                      color: category === item.value ? '#fff' : '#666',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 8 }}>
                时间
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TIME_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleFilterChange('timeFilter', item.value)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 13,
                      border: timeFilter === item.value ? 'none' : '1.5px solid #e8e8e8',
                      background: timeFilter === item.value ? 'var(--accent)' : '#fff',
                      color: timeFilter === item.value ? '#fff' : '#666',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: hasFilters ? 10 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 8 }}>
                地点关键词
              </div>
              <input
                className="input"
                placeholder="例如：曲江、大悦城、操场"
                value={location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                清除所有筛选
              </button>
            )}
          </div>
        )}

        {loading ? (
          <SkeletonList count={4} />
        ) : activities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧭</div>
            <div className="empty-state-title">
              {hasFilters ? '暂时没有匹配的搭子局' : '附近还没有新的搭子局'}
            </div>
            <div className="empty-state-desc">
              {hasFilters ? '换个场景或时间再试试。' : '你可以先发一个具体活动，别人会更容易报名。'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 8, paddingLeft: 4 }}>
              {hasFilters ? `找到 ${activities.length} 个活动` : '按时间优先展示即将开始的活动'}
            </div>
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onDelete={handleDelete}
                membershipStatus={myMemberships[activity.id] || null}
                isFull={activity.member_count >= activity.max_members}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

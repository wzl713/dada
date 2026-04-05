import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import Navbar from '../components/Navbar'

export default function EditActivity() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    max_members: 2,
    category: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const CATEGORIES = ['运动', '学习', '美食', '游戏', '户外', '娱乐', '社交', '其他']

  useEffect(() => {
    fetchActivity()
  }, [id])

  const fetchActivity = async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      alert('活动不存在')
      navigate('/')
      return
    }

    if (data.creator_id !== user.id) {
      alert('只有创建者才能编辑')
      navigate(`/activity/${id}`)
      return
    }

    // 把 ISO 时间转成 datetime-local 需要的格式
    const d = new Date(data.start_time)
    const localISO = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}T${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`

    setForm({
      title: data.title || '',
      description: data.description || '',
      location: data.location || '',
      start_time: localISO,
      max_members: data.max_members || 2,
      category: data.category || '',
    })
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('activities')
      .update({
        title: form.title,
        description: form.description,
        location: form.location,
        start_time: new Date(form.start_time).toISOString(),
        max_members: form.max_members,
        category: form.category || '其他',
      })
      .eq('id', id)

    setSaving(false)

    if (error) {
      alert('保存失败：' + error.message)
    } else {
      navigate(`/activity/${id}`)
    }
  }

  const update = (field, value) => setForm({ ...form, [field]: value })

  if (loading) {
    return (
      <div>
        <Navbar title="编辑活动" />
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div>
      <Navbar title="编辑活动" />

      <div className="container" style={{ paddingTop: 16, paddingBottom: 80 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            className="input"
            placeholder="活动标题（必填）"
            value={form.title}
            onChange={e => update('title', e.target.value)}
            required
          />

          <textarea
            className="input"
            placeholder="活动描述（可选）"
            rows={3}
            value={form.description}
            onChange={e => update('description', e.target.value)}
            style={{ resize: 'vertical' }}
          />

          <input
            className="input"
            placeholder="活动地点（必填）"
            value={form.location}
            onChange={e => update('location', e.target.value)}
            required
          />

          <input
            className="input"
            type="datetime-local"
            value={form.start_time}
            onChange={e => update('start_time', e.target.value)}
            required
          />

          <div>
            <label style={{ fontSize: 14, color: '#666', marginBottom: 6, display: 'block' }}>
              最大人数
            </label>
            <input
              className="input"
              type="number"
              min="2"
              max="99"
              value={form.max_members}
              onChange={e => update('max_members', parseInt(e.target.value) || 2)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 14, color: '#666', marginBottom: 8, display: 'block' }}>
              活动类型
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 14,
                    border: form.category === c ? '1.5px solid #1a1a1a' : '1.5px solid #e8e8e8',
                    background: form.category === c ? '#1a1a1a' : '#fff',
                    color: form.category === c ? '#fff' : '#666',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onClick={() => update('category', c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? '保存中...' : '保存修改'}
          </button>

          <button className="btn-outline" type="button" onClick={() => navigate(`/activity/${id}`)}>
            取消
          </button>
        </form>
      </div>
    </div>
  )
}

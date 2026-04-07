import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import Navbar from '../components/Navbar'
import { useToast } from '../components/toast-context'

const CATEGORIES = ['电影', '吃饭', '运动', '自习', '徒步', '展览', '其他']
const GENDER_OPTIONS = ['不限', '仅限女生', '仅限男生', '女生优先', '男生优先']

export default function EditActivity() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    max_members: 2,
    category: '',
    gender_requirement: '不限',
    meetup_note: '',
    safety_notice: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadActivity() {
      const { data, error } = await supabase.from('activities').select('*').eq('id', id).single()

      if (error || !data) {
        toast.error('活动不存在')
        navigate('/')
        return
      }

      if (data.creator_id !== user.id) {
        toast.error('只有发起人可以编辑')
        navigate(`/activity/${id}`)
        return
      }

      const date = new Date(data.start_time)
      const localISO = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}T${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`

      setForm({
        title: data.title || '',
        description: data.description || '',
        location: data.location || '',
        start_time: localISO,
        max_members: data.max_members || 2,
        category: data.category || '',
        gender_requirement: data.gender_requirement || '不限',
        meetup_note: data.meetup_note || '',
        safety_notice: data.safety_notice || '',
      })
      setLoading(false)
    }

    loadActivity()
  }, [id, navigate, toast, user.id])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.category) {
      toast.error('请先选择一个活动标签')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('activities')
      .update({
        title: form.title,
        description: form.description,
        location: form.location,
        start_time: new Date(form.start_time).toISOString(),
        max_members: form.max_members,
        category: form.category,
        gender_requirement: form.gender_requirement || '不限',
        meetup_note: form.meetup_note,
        safety_notice: form.safety_notice,
      })
      .eq('id', id)

    setSaving(false)

    if (error) {
      toast.error(error.message || '保存失败')
      return
    }

    toast.success('活动已更新')
    navigate(`/activity/${id}`)
  }

  if (loading) {
    return (
      <div>
        <Navbar title="编辑活动" showBack />
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div>
      <Navbar title="编辑活动" showBack />

      <div className="container" style={{ paddingTop: 16, paddingBottom: 80 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            className="input"
            placeholder="活动标题"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
          />

          <textarea
            className="input"
            placeholder="活动描述"
            rows={3}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />

          <input
            className="input"
            placeholder="活动地点"
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            required
          />

          <input
            className="input"
            type="datetime-local"
            value={form.start_time}
            onChange={(e) => update('start_time', e.target.value)}
            required
          />
          <div style={{ fontSize: 12, color: '#999', lineHeight: 1.6, marginTop: -8 }}>
            活动时间和地点会公开展示，请尽量写清楚，并优先选择公共场所。
          </div>

          <div>
            <label style={{ fontSize: 14, color: '#666', marginBottom: 6, display: 'block' }}>人数上限</label>
            <input
              className="input"
              type="number"
              min="2"
              max="6"
              value={form.max_members}
              onChange={(e) => update('max_members', parseInt(e.target.value, 10) || 2)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 14, color: '#666', marginBottom: 8, display: 'block' }}>活动场景</label>
            {!form.category && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>
                必选：请选择一个活动标签。
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => update('category', item)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontSize: 14,
                    border: form.category === item ? 'none' : '1.5px solid #e8e8e8',
                    background: form.category === item ? 'var(--primary)' : '#fff',
                    color: form.category === item ? '#fff' : '#666',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 14, color: '#666', marginBottom: 8, display: 'block' }}>性别要求</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GENDER_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => update('gender_requirement', item)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontSize: 14,
                    border: form.gender_requirement === item ? 'none' : '1.5px solid #e8e8e8',
                    background: form.gender_requirement === item ? 'var(--accent)' : '#fff',
                    color: form.gender_requirement === item ? '#fff' : '#666',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="input"
            rows={3}
            placeholder="集合方式 / AA / 注意事项"
            value={form.meetup_note}
            onChange={(e) => update('meetup_note', e.target.value)}
          />

          <textarea
            className="input"
            rows={3}
            placeholder="安全提示"
            value={form.safety_notice}
            onChange={(e) => update('safety_notice', e.target.value)}
          />

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

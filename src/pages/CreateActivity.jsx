import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import Navbar from '../components/Navbar'
import { uploadImage, compressImage } from '../utils/upload'
import { useToast } from '../components/Toast'

const CATEGORIES = ['运动', '学习', '美食', '游戏', '户外', '娱乐', '社交', '其他']

const TEMPLATES = [
  { title: '周末篮球局', description: '一起来打篮球！自带装备，约两小时。', category: '运动', location: '篮球场', max_members: 10 },
  { title: '一起学习打卡', description: '找个安静的咖啡馆一起学习，互相监督。', category: '学习', location: '咖啡馆', max_members: 4 },
  { title: '剧本杀组局', description: '缺人开本！快来报名。', category: '娱乐', location: '剧本杀店', max_members: 8 },
  { title: '户外徒步', description: '周末一起去爬山，呼吸新鲜空气。', category: '户外', location: '集合点待定', max_members: 15 },
]

export default function CreateActivity() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({ title: '', description: '', location: '', start_time: '', max_members: 2, category: '' })
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const fileInputRef = useRef(null)

  const handleCoverSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file, 1200, 0.8)
    setCoverFile(compressed)
    const reader = new FileReader()
    reader.onload = (ev) => setCoverPreview(ev.target.result)
    reader.readAsDataURL(compressed)
  }

  const useTemplate = (t) => {
    setForm({
      title: t.title,
      description: t.description,
      location: t.location,
      start_time: '',
      max_members: t.max_members,
      category: t.category,
    })
    setShowTemplates(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    let coverUrl = null
    if (coverFile) {
      const tempId = crypto.randomUUID()
      coverUrl = await uploadImage(coverFile, 'covers', tempId)
    }

    const { data, error } = await supabase.from('activities').insert({
      ...form,
      creator_id: user.id,
      start_time: new Date(form.start_time).toISOString(),
      category: form.category || '其他',
      cover_url: coverUrl || null,
    }).select()

    setLoading(false)

    if (error) {
      toast.error('发布失败')
    } else {
      toast.success('发布成功！')
      navigate('/')
    }
  }

  const update = (field, value) => setForm({ ...form, [field]: value })

  return (
    <div>
      <Navbar title="发布活动" showBack />

      <div className="container" style={{ paddingTop: 12, paddingBottom: 90 }}>
        {/* 模板入口 */}
        <button
          className="card"
          style={{
            width: '100%', textAlign: 'left', border: '2px dashed var(--border)',
            background: 'transparent', cursor: 'pointer', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12,
          }}
          onClick={() => setShowTemplates(!showTemplates)}
        >
          <span style={{ fontSize: 24 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--accent)' }}>使用模板快速发布</div>
            <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>一键填充热门活动信息</div>
          </div>
        </button>

        {showTemplates && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                className="card"
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer', padding: 14,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
                onClick={() => useTemplate(t)}
              >
                <span style={{ fontSize: 28 }}>{t.category === '运动' ? '🏀' : t.category === '学习' ? '📖' : t.category === '娱乐' ? '🎭' : '🏔️'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{t.description.slice(0, 25)}...</div>
                </div>
                <span style={{ color: '#ccc' }}>→</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 封面图 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', height: 180, borderRadius: 16,
              border: coverPreview ? 'none' : '2px dashed var(--border)',
              background: coverPreview ? `url(${coverPreview}) center/cover no-repeat` : '#fafafa',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', position: 'relative',
              transition: 'all 0.2s',
            }}
          >
            {!coverPreview && (
              <>
                <span style={{ fontSize: 32, marginBottom: 8 }}>📷</span>
                <span style={{ fontSize: 14, color: '#bbb' }}>添加封面图（可选）</span>
              </>
            )}
            {coverPreview && (
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                padding: '4px 12px', borderRadius: 12, fontSize: 12,
              }}>
                更换封面
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={handleCoverSelect} />

          <input className="input" placeholder="活动标题（必填）" value={form.title} onChange={e => update('title', e.target.value)} required />

          <textarea className="input" placeholder="活动描述（可选）" rows={3} value={form.description} onChange={e => update('description', e.target.value)} />

          <input className="input" placeholder="活动地点（必填）" value={form.location} onChange={e => update('location', e.target.value)} required />

          <input className="input" type="datetime-local" value={form.start_time} onChange={e => update('start_time', e.target.value)} required />

          <div>
            <label style={{ fontSize: 12, color: '#999', marginBottom: 6, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>最大人数</label>
            <input className="input" type="number" min="2" max="99" value={form.max_members} onChange={e => update('max_members', parseInt(e.target.value) || 2)} required />
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#999', marginBottom: 8, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>活动类型</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(c => (
                <button
                  key={c} type="button"
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 14,
                    border: form.category === c ? 'none' : '1.5px solid #e8e8e8',
                    background: form.category === c ? 'var(--primary)' : '#fff',
                    color: form.category === c ? '#fff' : '#666',
                    cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit',
                  }}
                  onClick={() => update('category', c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? '发布中...' : '发布活动'}
          </button>

          <button className="btn-outline" type="button" onClick={() => navigate('/')}>
            取消
          </button>
        </form>
      </div>
    </div>
  )
}

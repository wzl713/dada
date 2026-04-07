import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import Navbar from '../components/Navbar'
import { uploadImage, compressImage } from '../utils/upload'
import { useToast } from '../components/toast-context'
import { getCreditSummary } from '../utils/trust'

const CATEGORIES = ['电影', '吃饭', '运动', '自习', '徒步', '展览', '其他']
const GENDER_OPTIONS = ['不限', '仅限女生', '仅限男生', '女生优先', '男生优先']

const TEMPLATES = [
  {
    title: '今晚一起看电影',
    description: '临时组个电影搭子，看完就散，不尬聊。',
    category: '电影',
    location: '商场电影院',
    max_members: 2,
    meetup_note: '先在影院门口集合，票各自买。',
  },
  {
    title: '下班一起吃饭',
    description: '找 1-2 个人附近吃饭，AA，不拖拉。',
    category: '吃饭',
    location: '地铁站附近',
    max_members: 3,
    meetup_note: '默认 AA，迟到请提前说。',
  },
  {
    title: '周末羽毛球局',
    description: '缺搭子一起打球，两小时左右，自带拍。',
    category: '运动',
    location: '羽毛球馆',
    max_members: 3,
    meetup_note: '建议提前 10 分钟到场热身。',
  },
  {
    title: '咖啡馆自习',
    description: '安静学习 2 小时，中途少聊天，互相监督。',
    category: '自习',
    location: '安静咖啡馆',
    max_members: 3,
    meetup_note: '默认安静模式，交流控制在休息时间。',
  },
]

const DEFAULT_FORM = {
  title: '',
  description: '',
  location: '',
  start_time: '',
  max_members: 2,
  category: '',
  gender_requirement: '不限',
  meetup_note: '',
  safety_notice: '建议首次见面选择公共场所。仅限正常线下搭子活动，禁止骚扰、交易和任何越界行为。',
}

export default function CreateActivity() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [credit, setCredit] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let active = true
    getCreditSummary(user.id).then((summary) => {
      if (active) setCredit(summary)
    })
    return () => {
      active = false
    }
  }, [user.id])

  async function handleCoverSelect(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const compressed = await compressImage(file, 1200, 0.8)
    setCoverFile(compressed)

    const reader = new FileReader()
    reader.onload = (ev) => setCoverPreview(ev.target.result)
    reader.readAsDataURL(compressed)
  }

  function applyTemplate(template) {
    setForm((prev) => ({
      ...prev,
      title: template.title,
      description: template.description,
      location: template.location,
      start_time: '',
      max_members: template.max_members,
      category: template.category,
      meetup_note: template.meetup_note,
    }))
    setShowTemplates(false)
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.category) {
      toast.error('请先选择一个活动标签')
      return
    }

    if (credit?.level_key === 'low_credit') {
      toast.error('当前账号信用较低，暂时不能发起活动')
      return
    }

    setLoading(true)

    let coverUrl = null
    if (coverFile) {
      coverUrl = await uploadImage(coverFile, 'covers', `${user.id}/covers`)
    }

    const payload = {
      ...form,
      creator_id: user.id,
      start_time: new Date(form.start_time).toISOString(),
      category: form.category,
      cover_url: coverUrl,
    }

    const { error } = await supabase.from('activities').insert(payload)
    setLoading(false)

    if (error) {
      toast.error(error.message || '发布失败')
      return
    }

    toast.success('活动已发布，等人来加入吧')
    navigate('/')
  }

  return (
    <div>
      <Navbar title="发起搭子局" showBack />

      <div className="container" style={{ paddingTop: 12, paddingBottom: 90 }}>
        {credit?.level_key === 'low_credit' && (
          <div className="card" style={{ background: '#fff7ed', color: '#c2410c', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
            你的当前信用等级为 {credit.level_label}，暂时不能发起活动。完成已报名活动、减少爽约记录后会恢复。
          </div>
        )}

        <button
          type="button"
          className="card"
          style={{
            width: '100%',
            textAlign: 'left',
            border: '2px dashed var(--border)',
            background: 'transparent',
            cursor: 'pointer',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
          onClick={() => setShowTemplates((prev) => !prev)}
        >
          <span style={{ fontSize: 24 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--accent)' }}>套一个模板快速发起</div>
            <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>先把活动发出去，再慢慢优化细节。</div>
          </div>
        </button>

        {showTemplates && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TEMPLATES.map((template) => (
              <button
                key={template.title}
                type="button"
                className="card"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
                onClick={() => applyTemplate(template)}
              >
                <span style={{ fontSize: 28 }}>
                  {template.category === '电影'
                    ? '🎬'
                    : template.category === '吃饭'
                      ? '🍜'
                      : template.category === '运动'
                        ? '🏸'
                        : '📚'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{template.title}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{template.description}</div>
                </div>
                <span style={{ color: '#ccc' }}>→</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              height: 180,
              borderRadius: 16,
              border: coverPreview ? 'none' : '2px dashed var(--border)',
              background: coverPreview ? `url(${coverPreview}) center/cover no-repeat` : '#fafafa',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {!coverPreview && (
              <>
                <span style={{ fontSize: 32, marginBottom: 8 }}>📷</span>
                <span style={{ fontSize: 14, color: '#bbb' }}>添加封面图，可选</span>
              </>
            )}
            {coverPreview && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              >
                更换封面
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleCoverSelect}
          />

          <input
            className="input"
            placeholder="做什么？例如：今晚一起看《沙丘》"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
          />

          <textarea
            className="input"
            placeholder="补充下节奏、费用和预期，比如：看完就散、AA、不尬聊。"
            rows={3}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />

          <input
            className="input"
            placeholder="在哪里集合？例如：大悦城 5 楼影院门口"
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
            <label style={{ fontSize: 12, color: '#999', marginBottom: 6, display: 'block', fontWeight: 600 }}>
              人数上限
            </label>
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
            <label style={{ fontSize: 12, color: '#999', marginBottom: 8, display: 'block', fontWeight: 600 }}>
              活动场景
            </label>
            {!form.category && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>
                必选：请选择电影、吃饭、运动、学习等一个标签。
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
            <label style={{ fontSize: 12, color: '#999', marginBottom: 8, display: 'block', fontWeight: 600 }}>
              性别要求
            </label>
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
            placeholder="集合方式 / 是否 AA / 是否接受迟到 10 分钟 / 要不要自带装备"
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

          <button className="btn-primary" type="submit" disabled={loading || credit?.level_key === 'low_credit'} style={{ marginTop: 8 }}>
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

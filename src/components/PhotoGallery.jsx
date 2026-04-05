import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import { uploadImage, compressImage } from '../utils/upload'
import { useToast } from './Toast'

export default function PhotoGallery({ activityId }) {
  const { user } = useAuth()
  const toast = useToast()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // 加载照片
  const loadPhotos = async () => {
    const { data } = await supabase
      .from('activity_photos')
      .select('id, photo_url, created_at')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false })
    setPhotos(data || [])
    setLoading(false)
  }

  // 初始化时加载
  if (loading) { loadPhotos(); setLoading(false) }

  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const compressed = await compressImage(file, 1200, 0.8)
      const url = await uploadImage(compressed, 'photos', activityId)
      if (url) {
        await supabase.from('activity_photos').insert({
          activity_id: activityId,
          user_id: user.id,
          photo_url: url,
        })
        setPhotos(prev => [{ id: crypto.randomUUID(), photo_url: url, created_at: new Date().toISOString() }, ...prev])
      }
    }
    setUploading(false)
    toast.success('照片上传成功')
    e.target.value = ''
  }

  const handleDelete = async (photoId) => {
    await supabase.from('activity_photos').delete().eq('id', photoId)
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }

  if (photos.length === 0 && !loading) return null

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          活动相册 ({photos.length})
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13,
            cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          {uploading ? '上传中...' : '+ 添加照片'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {photos.map(p => (
          <div
            key={p.id}
            style={{
              position: 'relative', aspectRatio: '1', borderRadius: 10,
              background: `url(${p.photo_url}) center/cover no-repeat`,
              overflow: 'hidden', cursor: 'pointer',
            }}
            onClick={() => window.open(p.photo_url, '_blank')}
          >
            {p.user_id === user?.id && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  border: 'none', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import { uploadImage, compressImage } from '../utils/upload'
import { useToast } from './toast-context'

export default function PhotoGallery({ activityId, canUpload }) {
  const { user } = useAuth()
  const toast = useToast()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let active = true

    async function loadPhotos() {
      setLoading(true)
      const { data } = await supabase
        .from('activity_photos')
        .select('id, user_id, photo_url, created_at')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false })

      if (!active) return
      setPhotos(data || [])
      setLoading(false)
    }

    loadPhotos()
    return () => {
      active = false
    }
  }, [activityId])

  async function handleUpload(event) {
    const files = event.target.files
    if (!files || files.length === 0 || !canUpload) return

    setUploading(true)

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const compressed = await compressImage(file, 1200, 0.8)
      const url = await uploadImage(compressed, 'photos', `${user.id}/${activityId}`)

      if (url) {
        const { data } = await supabase
          .from('activity_photos')
          .insert({
            activity_id: activityId,
            user_id: user.id,
            photo_url: url,
          })
          .select('id, user_id, photo_url, created_at')
          .single()

        setPhotos((prev) => [data || { id: crypto.randomUUID(), user_id: user.id, photo_url: url, created_at: new Date().toISOString() }, ...prev])
      }
    }

    setUploading(false)
    toast.success('照片上传成功')
    event.target.value = ''
  }

  async function handleDelete(photoId) {
    await supabase.from('activity_photos').delete().eq('id', photoId)
    setPhotos((prev) => prev.filter((item) => item.id !== photoId))
  }

  if (loading) {
    return (
      <div className="card">
        <div style={{ fontSize: 13, color: '#999' }}>加载相册中...</div>
      </div>
    )
  }

  if (photos.length === 0 && !canUpload) return null

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          活动相册 ({photos.length})
        </div>
        {canUpload && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: 'inherit',
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
          </>
        )}
      </div>

      {photos.length === 0 ? (
        <div style={{ fontSize: 13, color: '#999', lineHeight: 1.6 }}>
          暂时还没有现场照片。活动开始后，参与者可以在这里补充现场记录。
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {photos.map((photo) => (
            <div
              key={photo.id}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 10,
                background: `url(${photo.photo_url}) center/cover no-repeat`,
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={() => window.open(photo.photo_url, '_blank')}
            >
              {photo.user_id === user?.id && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDelete(photo.id)
                  }}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { supabase } from '../supabaseClient'

/**
 * 上传图片到 Supabase Storage
 * @param {File} file - 图片文件
 * @param {string} bucket - 'avatars' 或 'covers'
 * @param {string} folderId - 用户 ID 或活动 ID（用作文件夹名）
 * @returns {string|null} 公开 URL 或 null
 */
export async function uploadImage(file, bucket, folderId) {
  if (!file) return null

  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    alert('仅支持 JPG、PNG、GIF、WebP 格式的图片')
    return null
  }

  // 验证文件大小（最大 5MB）
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB')
    return null
  }

  // 生成文件名：时间戳 + 随机数，避免冲突
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const filePath = `${folderId}/${fileName}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (error) {
    console.error('Upload error:', error)
    alert('上传失败：' + error.message)
    return null
  }

  // 获取公开 URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

/**
 * 压缩图片（可选，减少上传体积）
 * @param {File} file
 * @param {number} maxWidth - 最大宽度（默认 800px）
 * @param {number} quality - 压缩质量 0-1（默认 0.7）
 * @returns {Promise<File>}
 */
export function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    // 如果不是图片或者已经很小，直接返回
    if (!file.type.startsWith('image/') || file.size < 200 * 1024) {
      resolve(file)
      return
    }

    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target.result
    }
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }
    reader.readAsDataURL(file)
  })
}

export class VideoProcessor {
  static async extractFirstFrame(videoFile) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // 添加错误处理
      video.onerror = (error) => {
        console.error('视频加载失败:', error)
        reject(new Error('视频加载失败: ' + (error.message || '未知错误')))
      }

      // 添加加载超时处理
      const timeout = setTimeout(() => {
        video.onerror = null
        video.onloadedmetadata = null
        video.onseeked = null
        reject(new Error('视频加载超时'))
      }, 30000) // 30秒超时

      video.onloadedmetadata = () => {
        console.log('视频元数据加载完成，尺寸:', video.videoWidth, 'x', video.videoHeight)
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        // 设置视频时间到第一帧
        video.currentTime = 0
      }

      video.onseeked = () => {
        try {
          console.log('开始绘制第一帧到画布')
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('无法生成封面图片'))
              return
            }
            
            // 清理资源
            clearTimeout(timeout)
            URL.revokeObjectURL(video.src)
            
            resolve({
              blob,
              width: canvas.width,
              height: canvas.height
            })
          }, 'image/jpg', 0.95)
        } catch (error) {
          console.error('绘制视频帧失败:', error)
          reject(error)
        }
      }

      console.log('开始加载视频文件...')
      video.src = URL.createObjectURL(videoFile)
      // 设置视频静音，避免某些浏览器的自动播放限制
      video.muted = true
      // 加载视频
      video.load()
    })
  }

  static cleanFileName(fileName) {
    // 移除文件扩展名
    const extension = fileName.split('.').pop()
    let name = fileName.substring(0, fileName.length - extension.length - 1)

    // 移除所有 #tag 内容（包括 # 和后面的文字，直到空格或其他标签）
    name = name.replace(/#[^#\s@]+/g, '')
    
    // 移除所有 @用户 内容（包括 @ 和后面的文字，直到空格或其他标签）
    name = name.replace(/@[^#\s@]+/g, '')
    
    // 清理多余的空格
    name = name.replace(/\s+/g, ' ').trim()
    
    // 如果文件名变成空的了，使用 "未命名视频"
    if (!name) {
      name = "未命名视频"
    }

    return name // 不再添加扩展名
  }

  static isVideoFile(file) {
    return file.type.startsWith('video/')
  }

  static async processVideoFiles(files) {
    const videoFiles = []
    for (const file of files) {
      if (this.isVideoFile(file)) {
        // 使用 cleanFileName 处理初始文件名
        const cleanedName = this.cleanFileName(file.name)
        
        // 将清理后的名字添加到文件对象上
        Object.defineProperty(file, 'cleanedName', {
          value: cleanedName,
          writable: true, // 允许修改标题
          enumerable: true
        })

        videoFiles.push({
          file,
          originalName: file.name,
          cleanedName,
          size: file.size,
          type: file.type
        })
      }
    }
    return videoFiles
  }
} 
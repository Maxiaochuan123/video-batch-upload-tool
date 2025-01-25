import * as qiniu from 'qiniu-js'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'

export class QiniuUploadManager extends EventEmitter {
  constructor(config = {}) {
    super()
    this.config = {
      maxConcurrent: 6,
      chunkSize: 1024, // 1024KB (1MB)，这是七牛云允许的最大值
      retryCount: 3,
      ...config
    }
    
    this.uploadTasks = new Map()
  }

  async upload(file, token, key) {
    console.log('QiniuUploadManager.upload 开始:', { 
      key, 
      fileSize: file.size,
      fileName: file.name,
      isChunkedUpload: file.size > 10 * 1024 * 1024
    })
    
    // 所有文件都使用分片上传，保持行为一致
    const uploadConfig = {
      useCdnDomain: true,
      region: qiniu.region.z2,
      chunkSize: this.config.chunkSize,
      concurrentRequestLimit: this.config.maxConcurrent
    }

    // 从 key 判断是否是封面图片
    const isCover = key.includes('-cover')
    
    // 获取当前的视频标题
    const currentTitle = file.cleanedName
    
    const putExtra = {
      // 使用当前的视频标题作为文件名
      fname: isCover ? `${key.split('/').pop()}.jpg` : currentTitle + '.mp4',
      params: {},
      mimeType: isCover ? 'image/jpeg' : null,
      metadata: {
        'x-qn-meta-retryCount': '0'
      }
    }

    console.log('上传配置:', {
      key,
      fname: putExtra.fname,
      cleanedName: currentTitle,
      originalName: file.name
    })

    return new Promise((resolve, reject) => {
      console.log('创建上传对象...')
      const observable = qiniu.upload(
        file,
        key,
        token,
        putExtra,
        uploadConfig
      )

      console.log('开始订阅上传事件...')
      const subscription = observable.subscribe({
        next: (response) => {
          console.log('上传进度:', response.total.percent + '%')
          this.updateProgress(key, response)
        },
        error: (error) => {
          console.error('上传错误:', error)
          if (putExtra.metadata.retryCount < this.config.retryCount) {
            console.log('尝试重试上传...')
            putExtra.metadata.retryCount++
            this.upload(file, token, key)
              .then(resolve)
              .catch(reject)
          } else {
            this.emit('error', { key, error })
            reject(error)
          }
        },
        complete: (res) => {
          console.log('上传完成:', res)
          // 构造完整的访问URL
          res.url = `${this.config.domain}/${res.key}`
          this.emit('complete', { key, response: res })
          resolve(res)
        }
      })

      this.uploadTasks.set(key, {
        subscription,
        file,
        progress: 0,
        status: 'uploading'
      })
    })
  }

  updateProgress(key, response) {
    const task = this.uploadTasks.get(key)
    if (task) {
      task.progress = response.total.percent
      this.emit('progress', {
        key,
        progress: response.total.percent,
        loaded: response.total.loaded,
        size: response.total.size
      })
    }
  }

  cancelUpload(key) {
    const task = this.uploadTasks.get(key)
    if (task && task.subscription) {
      task.subscription.unsubscribe()
      task.status = 'cancelled'
      this.uploadTasks.delete(key)
      this.emit('cancel', { key })
    }
  }

  cancelAll() {
    for (const [key] of this.uploadTasks) {
      this.cancelUpload(key)
    }
  }

  getTaskStatus(key) {
    return this.uploadTasks.get(key)
  }

  getAllTasks() {
    return Array.from(this.uploadTasks.entries()).map(([key, task]) => ({
      key,
      ...task
    }))
  }
} 
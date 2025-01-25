<script setup>
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { QiniuUploadManager } from './utils/QiniuUploadManager'
import { VideoProcessor } from './utils/VideoProcessor'
import { ApiService } from './utils/ApiService'
import { v4 as uuidv4 } from 'uuid'
import LicenseActivation from './components/LicenseActivation.vue'

// 表单数据
const form = ref({
  userId: '',
  groupId: '',
  creationTitle: '',
  creationIntroduce: '',
  token: '',
  baseURL: 'https://pay.moujiang.com/apiAdmin'
})

// 是否是生产环境
const isProduction = ref(true)

// 切换到本地环境
const switchToLocal = () => {
  form.value.baseURL = 'http://192.168.110.101:8051'
  ApiService.setBaseURL(form.value.baseURL)
}

// 切换到线上环境
const switchToProduction = () => {
  form.value.baseURL = 'https://pay.moujiang.com/apiAdmin'
  ApiService.setBaseURL(form.value.baseURL)
}

// 监听 baseURL 变化
watch(() => form.value.baseURL, (newURL) => {
  ApiService.setBaseURL(newURL)
})

// 视频列表
const videos = ref([])

// 视频 URL 映射
const videoUrls = ref(new Map())

// 上传状态
const isUploading = ref(false)

// 计算属性：是否可以上传
const canUpload = computed(() => {
  return videos.value.length > 0 && 
         form.value.userId && 
         form.value.groupId &&
         form.value.token
})

// 获取视频 URL
const getVideoUrl = (file) => {
  if (!videoUrls.value.has(file.name)) {
    const url = URL.createObjectURL(file)
    videoUrls.value.set(file.name, url)
  }
  return videoUrls.value.get(file.name)
}

// 清理视频 URL
const clearVideoUrls = () => {
  videoUrls.value.forEach(url => {
    URL.revokeObjectURL(url)
  })
  videoUrls.value.clear()
}

// 选择文件夹
const selectFolder = async () => {
  try {
    const dirHandle = await window.showDirectoryPicker()
    const videoFiles = []
    
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile()
        if (VideoProcessor.isVideoFile(file)) {
          videoFiles.push(file)
        }
      }
    }
    
    // 清理旧的 URL
    clearVideoUrls()
    
    const processedVideos = await VideoProcessor.processVideoFiles(videoFiles)
    videos.value = processedVideos
  } catch (error) {
    
  }
}

// 开始上传
const startUpload = async () => {
  if (!canUpload.value) return
  
  isUploading.value = true
  const uploadManager = new QiniuUploadManager({
    domain: 'https://file.moujiang.com',
    maxConcurrent: 6,
    chunkSize: 1024,
    retryCount: 3
  })
  
  try {
    console.log('开始获取上传凭证...')
    const tokenResponse = await ApiService.getUploadToken(form.value.token)
    if (!tokenResponse) {
      throw new Error('获取上传凭证失败：返回数据为空')
    }
    const uploadToken = tokenResponse // tokenResponse 直接就是 token 字符串
    console.log('获取上传凭证成功:', uploadToken)
    
    // 监听上传进度
    uploadManager.on('progress', ({ key, progress }) => {
      const video = videos.value.find(v => v.uploadKey === key)
      if (video) {
        video.progress = progress
      }
    })
    
    for (const video of videos.value) {
      console.log('开始处理视频:', video.cleanedName)
      const key = `videos/${uuidv4()}`
      const coverKey = `${key}-cover`
      
      try {
        // 保存上传key用于跟踪进度
        video.uploadKey = key
        
        // 提取第一帧作为封面
        console.log('开始提取视频封面...')
        const { blob: coverBlob, width, height } = await VideoProcessor.extractFirstFrame(video.file)
          .catch(error => {
            console.error('提取视频封面失败:', error)
            throw new Error(`提取视频封面失败: ${error.message}`)
          })
        console.log('提取封面成功, 尺寸:', width, 'x', height)
        
        // 上传视频
        console.log('开始上传视频...')
        const videoRes = await uploadManager.upload(video.file, uploadToken, key)
          .catch(error => {
            console.error('上传视频失败:', error)
            throw new Error(`上传视频失败: ${error.message}`)
          })
        console.log('视频上传成功:', videoRes)
        
        // 上传封面
        console.log('开始上传封面...')
        const coverRes = await uploadManager.upload(coverBlob, uploadToken, coverKey)
          .catch(error => {
            console.error('上传封面失败:', error)
            throw new Error(`上传封面失败: ${error.message}`)
          })
        console.log('封面上传成功:', coverRes)
        
        // 提交到后端
        console.log('开始提交视频信息...')
        const { token, ...submitData } = form.value
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const randomTime = new Date(startOfMonth.getTime() + Math.random() * (now.getTime() - startOfMonth.getTime()))
        
        // 格式化时间为 "YYYY-MM-DD HH:mm:ss"
        const formatDate = (date) => {
          const pad = (num) => String(num).padStart(2, '0')
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
        }
        
        // 检查必要的URL
        if (!videoRes.url) {
          throw new Error('视频URL为空')
        }
        if (!coverRes.url) {
          throw new Error('封面URL为空')
        }

        console.log('提交数据:', {
          ...submitData,
          creationUrl: videoRes.url,
          creationCover: coverRes.url,
          coverWidth: width,
          coverHeight: height,
          creationTitle: video.cleanedName,
          creationIntroduce: video.description || '',
          createTime: formatDate(randomTime)
        })

        const submitResult = await ApiService.submitVideo({
          ...submitData,
          creationUrl: videoRes.url,
          creationCover: coverRes.url,
          coverWidth: width,
          coverHeight: height,
          creationTitle: video.cleanedName,
          creationIntroduce: video.description || '',
          createTime: formatDate(randomTime)
        })
        
        if (!submitResult || !submitResult.code) {
          throw new Error('提交视频信息失败：服务器响应异常')
        }
        
        console.log('提交视频信息成功:', submitResult)
        
        // 更新进度
        video.progress = 100
        video.status = 'success'
        ElMessage.success(`上传成功：${video.cleanedName}`)
      } catch (error) {
        console.error('处理视频失败:', error)
        video.status = 'error'
        ElMessage.error(`上传失败：${video.cleanedName}`)
      }
    }
  } catch (error) {
    console.error('获取上传凭证失败:', error)
    // 清空 token，提示重新填写
    form.value.token = ''
    ElMessage.error('Token已过期，请重新填写授权Token')
  } finally {
    isUploading.value = false
  }
}

// 移除视频
const removeVideo = (video) => {
  const index = videos.value.findIndex(v => v.file.name === video.file.name)
  if (index > -1) {
    // 移除视频 URL
    if (videoUrls.value.has(video.file.name)) {
      URL.revokeObjectURL(videoUrls.value.get(video.file.name))
      videoUrls.value.delete(video.file.name)
    }
    // 移除视频
    videos.value.splice(index, 1)
  }
}

// 组件销毁时清理资源
onBeforeUnmount(() => {
  clearVideoUrls()
})
</script>

<template>
  <div class="app-container">
    <LicenseActivation />
    <!-- 左侧参数输入区 -->
    <div class="input-section">
      <div class="input-card">
        <h2 class="section-title">上传参数</h2>
        <el-form :model="form" label-width="100px" class="upload-form">
          <el-form-item label="环境地址" required>
            <div class="base-url-input">
              <el-input 
                v-model="form.baseURL" 
                placeholder="请输入API地址"
              />
              <div class="env-switch">
                <el-radio-group 
                  v-model="isProduction" 
                  @change="(val) => val ? switchToProduction() : switchToLocal()"
                >
                  <el-radio :label="true">线上环境</el-radio>
                  <el-radio :label="false">本地环境</el-radio>
                </el-radio-group>
              </div>
            </div>
          </el-form-item>
          <el-form-item label="Token" required>
            <el-input 
              v-model="form.token" 
              type="password" 
              placeholder="请输入授权Token" 
              show-password
            />
          </el-form-item>
          <el-form-item label="用户ID" required>
            <el-input v-model="form.userId" placeholder="请输入用户ID" />
          </el-form-item>
          <el-form-item label="社群ID" required>
            <el-input v-model="form.groupId" placeholder="请输入社群ID" />
          </el-form-item>
          <el-form-item>
            <el-button
              type="success"
              @click="startUpload"
              :disabled="!canUpload || isUploading"
              :loading="isUploading"
              size="large"
              class="upload-button"
            >
              <el-icon class="el-icon--left"><Upload /></el-icon>
              开始上传
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 右侧视频列表区 -->
    <div class="video-section">
      <div class="video-card">
        <div class="video-header">
          <h2 class="section-title">视频列表</h2>
          <el-button 
            v-if="videos.length > 0"
            type="primary" 
            @click="selectFolder" 
            :disabled="isUploading" 
            size="default"
          >
            <el-icon class="el-icon--left"><Folder /></el-icon>
            重新选择
          </el-button>
        </div>
        <div v-if="videos.length === 0" class="empty-tip">
          <el-icon class="empty-icon"><VideoCamera /></el-icon>
          <span>请选择包含视频的文件夹</span>
          <el-button 
            type="primary" 
            @click="selectFolder" 
            :disabled="isUploading" 
            size="large"
            class="select-folder-btn"
          >
            <el-icon class="el-icon--left"><Folder /></el-icon>
            选择文件夹
          </el-button>
        </div>
        <div v-else class="video-list">
          <div v-for="video in videos" :key="video.file.name" class="video-item">
            <div class="video-preview">
              <video
                :src="getVideoUrl(video.file)"
                controls
                width="100%"
                height="auto"
              ></video>
              <div class="video-actions">
                <el-button
                  type="danger"
                  size="small"
                  circle
                  @click="removeVideo(video)"
                  :disabled="isUploading"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="video-info">
              <div class="video-field">
                <label class="video-label">视频标题</label>
                <el-input
                  v-model="video.cleanedName"
                  placeholder="请输入视频标题"
                  size="default"
                  @input="(val) => { video.file.cleanedName = val }"
                />
              </div>
              <div class="video-field">
                <label class="video-label">视频介绍</label>
                <el-input
                  v-model="video.description"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入视频介绍"
                  size="default"
                />
              </div>
              <div class="progress-info" v-if="video.progress !== undefined">
                <el-progress
                  :percentage="video.progress"
                  :status="video.status === 'error' ? 'exception' : 'success'"
                  :stroke-width="8"
                  :duration="8"
                  :indeterminate="video.status === 'error'"
                  :striped="video.status !== 'error'"
                  :striped-flow="video.status !== 'error'"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  padding: 16px;
  margin: 0;
  background-color: #f0f2f5;
  box-sizing: border-box;
  gap: 16px;
}

.section-title {
  margin: 0 0 24px 0;
  padding: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  text-align: center;
}

.input-section {
  flex: 0 0 400px;
  min-height: 0;
}

.input-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  height: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.base-url-input {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.env-switch {
  display: flex;
  justify-content: center;
  align-items: center;
}

.upload-form {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
  margin-bottom: 20px;
}

.upload-button {
  width: 100%;
}

.video-section {
  flex: 1;
  height: calc(100vh - 32px);
  min-height: 0;
  min-width: 300px;
}

.video-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  height: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.video-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  gap: 16px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.select-folder-btn {
  margin-top: 16px;
}

.video-list {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  padding-right: 10px;
  margin: 0 -10px 0 0;
  min-height: 0;
  align-items: start;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}

::-webkit-scrollbar-track {
  background-color: transparent;
}

.video-item {
  background-color: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease-in;
  }
}

.video-preview {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000;
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
  height: 200px;
}

.video-preview video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 视频控件样式 */
.video-preview video::-webkit-media-controls-enclosure {
  display: flex !important;
}

.video-preview video::-webkit-media-controls-panel {
  display: flex !important;
}

/* 显示需要的控件 */
.video-preview video::-webkit-media-controls-play-button {
  display: flex !important;
}

.video-preview video::-webkit-media-controls-timeline-container {
  display: flex !important;
}

.video-preview video::-webkit-media-controls-current-time-display {
  display: flex !important;
}

.video-preview video::-webkit-media-controls-time-remaining-display {
  display: flex !important;
}

.video-preview video::-webkit-media-controls-timeline {
  display: flex !important;
}

.video-preview video::-webkit-media-controls-fullscreen-button {
  display: flex !important;
}

/* 隐藏不需要的控件 */
.video-preview video::-webkit-media-controls-volume-slider,
.video-preview video::-webkit-media-controls-mute-button,
.video-preview video::-webkit-media-controls-volume-slider-container,
.video-preview video::-webkit-media-controls-overflow-button {
  display: none !important;
}

.video-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
}

.video-actions .el-button {
  width: 32px;
  height: 32px;
  background-color: transparent;
  border: none;
  padding: 0;
  transition: all 0.2s ease;
}

.video-actions .el-button:hover {
  transform: scale(1.2);
}

.video-actions .el-button:active {
  transform: scale(0.95);
}

.video-actions .el-icon {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.7);
  transition: color 0.2s ease;
}

.video-actions .el-button:hover .el-icon {
  color: #f56c6c;
}

.video-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.video-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.video-info .el-input {
  width: 100%;
}

.progress-info {
  width: 100%;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-button--large) {
  padding: 12px 24px;
  font-size: 16px;
}
:deep(.el-progress__text) {
  min-width: 0;
}
</style>

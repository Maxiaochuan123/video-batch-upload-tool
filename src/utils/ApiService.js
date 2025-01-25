import axios from 'axios'

// 创建 axios 实例
let api = null

// 初始化 axios 实例
function createApi(baseURL = 'https://pay.moujiang.com/apiAdmin') {
  api = axios.create({
    baseURL,
    timeout: 30000
  })

  // 添加响应拦截器
  api.interceptors.response.use(
    response => response,
    error => {
      if (error.response) {
        // 服务器返回错误状态码
        if (error.response.status === 401) {
          throw new Error('Token已过期或无效')
        } else {
          throw new Error(error.response.data?.message || '请求失败')
        }
      } else if (error.request) {
        // 请求发出但没有收到响应
        throw new Error('网络连接失败，请检查网络')
      } else {
        // 请求配置出错
        throw new Error('请求配置错误')
      }
    }
  )

  return api
}

// 初始化默认实例
createApi()

export class ApiService {
  static async getUploadToken(authorization) {
    try {
      const response = await api.post('/api/upload/uploadToken', null, {
        headers: {
          Authorization: authorization
        }
      })
      // 确保返回正确的数据结构
      if (response.data && response.data.code === 200) {
        return response.data.data // 直接返回 token 字符串
      }
      throw new Error(response.data?.msg || '获取上传凭证失败')
    } catch (error) {
      throw error
    }
  }

  static async submitVideo(data) {
    console.log('提交视频数据:', data) // 添加日志查看提交的数据
    try {
      const response = await api.post('/api/v1/man/insert', {
        status: "1",
        examineStatus: "1",
        creationType: 1,
        ...data // 确保包含所有字段，包括 createTime
      })
      return response.data
    } catch (error) {
      throw error
    }
  }

  // 设置基础URL
  static setBaseURL(url) {
    createApi(url)
  }

  // 设置请求拦截器
  static setRequestInterceptor(callback) {
    api.interceptors.request.use(callback)
  }

  // 设置响应拦截器
  static setResponseInterceptor(successCallback, errorCallback) {
    api.interceptors.response.use(successCallback, errorCallback)
  }
} 
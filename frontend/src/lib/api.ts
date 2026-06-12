/**
 * @module API
 * @description 统一的 HTTP 请求层，封装了认证、对话、文档、引用四大模块的 API 调用
 * @author RETALK Team
 * @date 2026-04
 */

import axios from 'axios'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Document,
  Citation,
  Message,
  Conversation,
  ChatResponse,
  User,
} from '@/types'

// ============ Axios 实例与拦截器配置 ============

/** 后端 API 基础地址，优先读取环境变量 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

/** 全局 Axios 实例，所有请求都通过它发出 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// 每次发请求前，自动把本地存储的登录令牌塞到请求头里，这样后端就知道你是谁
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 如果后端返回 401（未授权），说明登录过期了，自动清掉令牌并跳转到登录页
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ============ 认证 API ============

/** 认证相关接口（登录、注册、注销、获取当前用户） */
export const authApi = {
  /**
   * 用户登录
   * 将前端 remember 字段映射为后端的 remember_me
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    // 把前端表单的字段名转成后端需要的格式，然后发登录请求
    const payload = {
      username: data.username,
      password: data.password,
      remember_me: data.remember,
    }
    const res = await api.post('/auth/login', payload)
    return res.data
  },

  /** 用户注册 */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await api.post('/auth/register', data)
    return res.data
  },

  /** 用户注销 */
  logout: async () => api.post('/auth/logout'),

  /**
   * 获取当前登录用户信息
   * 当前从 localStorage 读取，后续可对接 /auth/me 接口
   */
  getCurrentUser: async (): Promise<User> => {
    // 暂时从浏览器本地存储里读用户信息，没有的话就报错
    const userStr = localStorage.getItem('user')
    if (userStr) return JSON.parse(userStr)
    throw new Error('No user data')
  },
}

// ============ 对话 API ============

/** 对话相关接口（列表、创建、详情、消息、删除） */
export const conversationApi = {
  /** 获取对话列表 */
  list: async (): Promise<Conversation[]> => {
    const res = await api.get('/conversations')
    // 后端可能返回 { data: [...] } 或直接返回数组，这里兼容两种格式
    return res.data.data || res.data
  },

  /** 创建新对话 */
  create: async (): Promise<Conversation> => {
    const res = await api.post('/conversations')
    return res.data
  },

  /** 获取对话详情 */
  get: async (id: string): Promise<Conversation> => {
    const res = await api.get(`/conversations/${id}`)
    return res.data
  },

  /** 获取指定对话的消息列表 */
  getMessages: async (id: string): Promise<Message[]> => {
    // 对话详情接口会把消息也一起返回，这里只取消息部分
    const res = await api.get(`/conversations/${id}`)
    return res.data.messages || []
  },

  /** 删除对话 */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/conversations/${id}`)
  },

  /**
   * 发送聊天消息
   * 如果传入 conversationId 则在已有对话中发送，否则后端会自动创建新对话
   */
  sendMessage: async (conversationId: string | undefined, message: string): Promise<ChatResponse> => {
    const payload: Record<string, any> = { message }
    if (conversationId) {
      payload.conversation_id = conversationId
    }
    // 把消息发给 AI 聊天接口，等待 AI 返回回答和引用
    const res = await api.post('/chat/completions', payload)
    return res.data
  },

  /** 删除对话中的单条消息 */
  deleteMessage: async (conversationId: string, messageId: string): Promise<void> => {
    await api.delete(`/conversations/${conversationId}/messages/${messageId}`)
  },
}

// ============ 文档 API ============

/** 文档相关接口（列表、上传、删除） */
export const documentApi = {
  /** 获取文档列表 */
  list: async (): Promise<Document[]> => {
    const res = await api.get('/documents')
    return res.data.data || res.data
  },

  /**
   * 上传文档
   * @param file - 要上传的文件对象
   * @param onProgress - 上传进度回调，参数为 0-100 的百分比
   */
  upload: async (file: File, onProgress?: (progress: number) => void): Promise<Document> => {
    const formData = new FormData()
    formData.append('file', file)
    // 用 FormData 格式上传文件，同时监听上传进度并通过回调通知调用方
    const res = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total))
        }
      },
    })
    return res.data
  },

  /** 删除文档 */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`)
  },
}

// ============ 引用 API ============

/** 引用相关接口（获取详情、导出） */
export const citationApi = {
  /** 获取单条引用详情 */
  get: async (citationId: string): Promise<Citation> => {
    const res = await api.get(`/citations/${citationId}`)
    return res.data
  },

  /**
   * 导出引用为指定格式
   * @param messageId - 消息 ID，导出该消息关联的所有引用
   * @param format - 导出格式：bibtex 或 gbt7714
   */
  export: async (messageId: string, format: 'bibtex' | 'gbt7714'): Promise<string> => {
    // 根据消息 ID 和格式，让后端生成引用文本（BibTeX 或国标格式）
    const res = await api.get('/citations/export', {
      params: { message_id: messageId, format },
    })
    return res.data
  },
}

export default api

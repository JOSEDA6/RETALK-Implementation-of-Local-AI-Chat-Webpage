/**
 * @module Types
 * @description 全局 TypeScript 类型定义，涵盖用户、对话、消息、文档、引用等核心数据结构
 * @author RETALK Team
 * @date 2026-04
 */

// ============ 用户与认证相关类型 ============

/** 用户信息 */
export interface User {
  /** UUID v4 字符串，禁止转换为数字 */
  id: string
  /** 用户名，唯一标识 */
  username: string
  /** ISO 8601 时间戳字符串 */
  created_at?: string
}

/** 认证响应（登录/注册接口返回值） */
export interface AuthResponse {
  /** UUID v4 字符串，禁止转换为数字 */
  user_id: string
  /** JWT 令牌，用于后续请求鉴权 */
  token: string
  /** ISO 8601 时间戳字符串 */
  expires_at?: string
  /** 可选的完整用户对象 */
  user?: User
}

// ============ 文档相关类型 ============

/** 上传的文献文档 */
export interface Document {
  /** UUID v4 字符串，禁止转换为数字 */
  id: string
  /** 文档标题（通常为文件名） */
  title: string
  /** 服务端存储路径 */
  file_path: string
  /** 文件 MIME 类型（如 application/pdf） */
  file_type?: string
  /** 文件大小，单位为字节 */
  file_size: number
  /** ISO 8601 时间戳字符串 */
  upload_time: string
  /** 文档处理状态：uploaded=已上传，parsed=已解析，failed=解析失败 */
  status: 'uploaded' | 'parsed' | 'failed'
  /** 文档被切分成的文本片段数量，默认值 0，当 status !== 'parsed' 时可能为空 */
  chunk_count?: number
}

// ============ 引用相关类型 ============

/** AI 回答中的引用来源 */
export interface Citation {
  /** UUID v4 字符串，禁止转换为数字 */
  id: string
  /** UUID v4 字符串，禁止转换为数字 */
  document_id: string
  /** 引用所属文档的标题 */
  document_title: string
  /** 引用所在页码，可选，某些引用可能没有页码 */
  page?: number
  /** 引用的文本内容 */
  content: string
  /** UUID v4 字符串，禁止转换为数字 */
  chunk_id: string
}

// ============ 消息相关类型 ============

/** 对话中的单条消息 */
export interface Message {
  /** UUID v4 字符串，禁止转换为数字 */
  id: string
  /** UUID v4 字符串，禁止转换为数字 */
  conversation_id: string
  /** 消息角色：user=用户发送，assistant=AI 回复 */
  role: 'user' | 'assistant'
  /** 消息文本内容 */
  content: string
  /** 关联的引用列表，默认值 []，用户消息通常没有引用 */
  citations?: Citation[]
  /** ISO 8601 时间戳字符串 */
  created_at: string
}

// ============ 对话相关类型 ============

/** 一次完整的对话会话 */
export interface Conversation {
  /** UUID v4 字符串，禁止转换为数字 */
  id: string
  /** 对话标题 */
  title: string
  /** ISO 8601 时间戳字符串 */
  created_at: string
  /** ISO 8601 时间戳字符串 */
  updated_at: string
  /** 使用的模型类型 */
  model_type: 'ollama' | 'qwen'
  /** 该对话下的所有消息，仅在详情接口返回 */
  messages?: Message[]
}

/** 按日期分组后的对话组 */
export interface ConversationGroup {
  /** 分组标签（如"今天"、"昨天"） */
  label: string
  /** 该分组下的对话列表 */
  conversations: Conversation[]
}

// ============ 聊天请求/响应类型 ============

/** 聊天接口响应 */
export interface ChatResponse {
  /** AI 生成的回答文本 */
  answer: string
  /** 回答中引用的文献来源列表 */
  citations: Citation[]
  /** UUID v4 字符串，禁止转换为数字 */
  conversation_id: string
}

/** 登录请求参数 */
export interface LoginRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 是否记住登录状态（7 天免登录） */
  remember?: boolean
}

/** 注册请求参数 */
export interface RegisterRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
}

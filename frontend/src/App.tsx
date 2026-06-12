/**
 * @module App
 * @description RETALK 应用根组件，负责全局状态管理、认证路由和页面布局编排
 * @author RETALK Team
 * @date 2026-04
 */

import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { authApi, conversationApi } from './lib/api'
import { useCurrentUser } from './hooks/useAuth'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import ChatArea from './components/chat/ChatArea'
import CitationPanel from './components/layout/CitationPanel'
import LoginForm from './components/auth/LoginForm'
import RegisterForm from './components/auth/RegisterForm'
import type { Conversation, Citation } from './types'
import './styles/globals.css'

// ============ React Query 全局配置 ============
// 这是一个"数据请求管家"，帮我们管理所有和服务器之间的数据请求和缓存
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // 切换浏览器标签页回来后，不自动重新请求数据，避免不必要的网络消耗
      refetchOnWindowFocus: false,
    },
  },
})

// ============ 应用主内容组件 ============

/**
 * 应用主内容区域组件
 * 负责认证状态判断、页面布局和核心交互逻辑
 */
function AppContent() {
  /** 是否显示注册表单（true=注册页，false=登录页） */
  const [showRegister, setShowRegister] = useState(false)
  /** 当前选中的对话 ID，undefined 表示未选中任何对话 */
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>()
  /** 当前展示的引用列表 */
  const [citations, setCitations] = useState<Citation[]>([])
  /** 引用面板是否展开 */
  const [isCitationPanelOpen, setIsCitationPanelOpen] = useState(false)
  /** 最后一条消息的 ID，用于引用导出时关联消息 */
  const [lastMessageId, setLastMessageId] = useState<string | undefined>()
  /** 登录成功标记，用于触发 UI 刷新 */
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 从缓存中获取当前登录用户的信息，如果没登录就是 null
  const { data: user } = useCurrentUser()

  // 当检测到用户已登录（user 有值或 isLoggedIn 标记为 true），自动切回主界面
  useEffect(() => {
    if (user || isLoggedIn) {
      setShowRegister(false)
      setIsLoggedIn(false)
    }
  }, [user, isLoggedIn])

  /**
   * 登录成功回调
   * 刷新用户查询缓存并标记登录状态
   */
  const handleLoginSuccess = () => {
    // 登录成功后，通知数据管家重新获取用户信息，这样界面就会自动更新
    queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    setIsLoggedIn(true)
  }

  /**
   * 退出登录处理
   * 调用后端注销接口并清理本地存储和缓存
   */
  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // 不管退出接口成功还是失败，都把本地保存的登录凭证和缓存数据全部清掉
      localStorage.removeItem('token')
      queryClient.clear()
    }
  }

  /**
   * 发送消息处理函数
   * 如果没有当前对话则自动创建新对话，然后发送消息并返回响应
   */
  const handleSendMessage = async (content: string) => {
    let convId = currentConversationId

    // 如果用户还没选择任何对话，就自动帮他创建一个新的对话
    if (!convId) {
      const newConv = await conversationApi.create()
      convId = newConv.id
      setCurrentConversationId(convId)
    }

    // 把用户输入的内容发送给后端，后端会返回 AI 的回答和相关引用
    const response = await conversationApi.sendMessage(convId, content)
    return { answer: response.answer, citations: response.citations, conversation_id: response.conversation_id || convId }
  }

  /**
   * 查看引用详情
   * 打开引用面板并填充引用数据
   */
  const handleViewCitations = (messageCitations: Citation[], messageId?: string) => {
    setCitations(messageCitations)
    setLastMessageId(messageId)
    setIsCitationPanelOpen(true)
  }

  // ============ 未登录 — 渲染认证页面 ============
  // 如果用户没登录，就显示登录或注册表单，不显示主界面
  if (!user) {
    return (
      <div className="min-h-screen bg-clay-100 flex items-center justify-center p-4">
        {showRegister ? (
          <RegisterForm onSwitchToLogin={() => setShowRegister(false)} onSuccess={handleLoginSuccess} />
        ) : (
          <LoginForm onSwitchToRegister={() => setShowRegister(true)} onSuccess={handleLoginSuccess} />
        )}
      </div>
    )
  }

  // ============ 已登录 — 渲染主界面布局 ============
  // 登录后的主界面分三栏：左边侧边栏、中间聊天区、右边引用面板
  return (
    <div className="h-screen flex flex-col bg-clay-100">
      <Header onLogout={handleLogout} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentConversationId={currentConversationId}
          onSelectConversation={setCurrentConversationId}
        />
        <main className="flex-1 flex flex-col min-w-[480px]">
          <ChatArea
            conversationId={currentConversationId}
            onSendMessage={handleSendMessage}
            onViewCitations={handleViewCitations}
            onViewAllCitations={handleViewCitations}
            onConversationCreated={setCurrentConversationId}
          />
        </main>
        <CitationPanel
          citations={citations}
          isOpen={isCitationPanelOpen}
          onClose={() => setIsCitationPanelOpen(false)}
          messageId={lastMessageId}
        />
      </div>
    </div>
  )
}

// ============ 顶层 App 包装组件 ============

/**
 * 应用顶层入口组件
 * 用 QueryClientProvider 包裹整个应用，提供全局数据请求能力
 */
// 这个组件的作用就是给整个应用套上一个"数据管家"，让所有子组件都能方便地请求和缓存数据
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App

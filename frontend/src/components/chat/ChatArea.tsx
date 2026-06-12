/**
 * @module ChatArea
 * @description 聊天区域主组件，整合消息列表、输入框和欢迎屏，处理消息发送、删除和引用查看
 * @author RETALK Team
 * @date 2026-04
 */

import React, { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMessages, useDeleteMessage } from '@/hooks/useConversation'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import WelcomeScreen from './WelcomeScreen'
import type { Message, Citation } from '@/types'

/** ChatArea 组件的 Props */
interface ChatAreaProps {
  /** 当前选中的对话 ID */
  conversationId?: string
  /** 发送消息的回调，返回 AI 回复和引用 */
  onSendMessage?: (content: string) => Promise<{ answer: string; citations: Citation[]; conversation_id: string }>
  /** 查看单条引用详情的回调 */
  onViewCitations?: (citations: Citation[], messageId?: string) => void
  /** 查看消息所有引用的回调 */
  onViewAllCitations?: (citations: Citation[], messageId: string) => void
  /** 新对话创建成功后的回调，传回新对话 ID */
  onConversationCreated?: (id: string) => void
}

/**
 * 聊天区域组件
 * 根据是否有对话显示欢迎屏或消息列表，处理消息发送和自动滚动
 */
export default function ChatArea({ conversationId, onSendMessage, onViewCitations, onViewAllCitations, onConversationCreated }: ChatAreaProps) {
  /** 是否正在发送消息（防止重复提交） */
  const [isSending, setIsSending] = useState(false)
  /** AI 是否正在思考（显示 Thinking 动画） */
  const [isThinking, setIsThinking] = useState(false)
  const queryClient = useQueryClient()

  // 从后端拉取当前对话的所有消息，没有对话 ID 就返回空数组
  const { data: messages = [], isLoading, isError } = useMessages(conversationId)
  const deleteMessageMutation = useDeleteMessage()

  /** 滚动容器引用，用于自动滚动到底部 */
  const scrollRef = useRef<HTMLDivElement>(null)

  // 每当消息列表变化或 AI 开始思考时，自动把聊天区域滚动到最底部，让用户看到最新内容
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, isThinking])

  /**
   * 发送消息处理函数
   * 防止重复提交，发送后刷新消息和对话缓存
   */
  const handleSend = async (content: string) => {
    if (isSending) return
    setIsSending(true)
    setIsThinking(true)

    try {
      // 调用父组件传入的发送函数，等 AI 返回结果
      const response = await onSendMessage?.(content)
      if (!response) return

      // 如果之前没有对话（首次发消息），通知父组件记录新创建的对话 ID
      if (!conversationId && onConversationCreated) {
        onConversationCreated(response.conversation_id)
      }

      // 发送成功后，通知数据管家重新拉取消息和对话列表，让新消息显示出来
      queryClient.invalidateQueries({ queryKey: ['messages', response.conversation_id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    } catch (error) {
      console.error('发送消息失败:', error)
    } finally {
      setIsSending(false)
      setIsThinking(false)
    }
  }

  /** 删除单条消息 */
  const handleDeleteMessage = async (messageId: string) => {
    if (!conversationId) return
    await deleteMessageMutation.mutateAsync({ conversationId, messageId })
  }

  /**
   * 点击引用标记时的处理
   * 从消息列表中找到对应的引用并打开引用面板
   */
  // 用户点击消息里的 [1] [2] 引用标记时，找到对应的引用数据，然后打开右侧引用面板
  const handleCitationClick = (citationId: string) => {
    const citation = messages.find(m => m.citations?.some(c => c.id === citationId))?.citations?.find(c => c.id === citationId)
    const messageId = messages.find(m => m.citations?.some(c => c.id === citationId))?.id
    onViewCitations?.(citation ? [citation] : [], messageId)
  }

  /** 查看消息的所有引用 */
  const handleViewAllCitations = (citations: Citation[], messageId: string) => {
    onViewCitations?.(citations, messageId)
  }

  // ============ 无对话时 — 显示欢迎屏 ============
  // 如果用户还没选择任何对话，也没有消息，就显示欢迎页面和快捷问题
  if (!conversationId && messages.length === 0 && !isThinking) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden">
          <WelcomeScreen onSendQuickQuestion={(q) => handleSend(q)} />
        </div>
        <div className="border-t border-clay-300 p-4 bg-clay-100 shrink-0">
          <MessageInput onSend={handleSend} disabled={isSending} />
        </div>
      </div>
    )
  }

  // ============ 有对话时 — 显示消息列表和输入框 ============
  const showLoading = isLoading && messages.length === 0

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-x-hidden">
        {showLoading ? (
          <div className="flex items-center justify-center h-full text-stone-400">加载中...</div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-stone-400">加载失败</div>
        ) : (
          <MessageList
            key={conversationId}
            messages={messages}
            onDeleteMessage={handleDeleteMessage}
            onCitationClick={handleCitationClick}
            onViewAllCitations={handleViewAllCitations}
            isThinking={isThinking}
            scrollRef={scrollRef}
          />
        )}
      </div>
      {/* 底部消息输入区域 */}
      <div className="border-t border-clay-300 p-4 bg-clay-100 shrink-0">
        <MessageInput onSend={handleSend} disabled={isSending} />
      </div>
    </div>
  )
}

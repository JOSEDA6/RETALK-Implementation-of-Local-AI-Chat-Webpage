/**
 * @module MessageList
 * @description 消息列表组件，负责渲染所有聊天消息和 AI 思考中的动画
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import type { Message, Citation } from '@/types'
import MessageBubble from './MessageBubble'

/** MessageList 组件的 Props */
interface MessageListProps {
  /** 消息数组 */
  messages: Message[]
  /** 删除消息的回调 */
  onDeleteMessage?: (messageId: string) => void
  /** 点击引用标记的回调 */
  onCitationClick?: (citationId: string) => void
  /** 查看消息所有引用的回调 */
  onViewAllCitations?: (citations: Citation[], messageId: string) => void
  /** AI 是否正在思考（显示加载动画） */
  isThinking?: boolean
  /** 滚动容器的 ref，由父组件控制自动滚动 */
  scrollRef?: React.RefObject<HTMLDivElement>
}

/**
 * 消息列表组件
 * 遍历消息数组渲染气泡，底部在 AI 思考时显示跳动的圆点动画
 */
export default function MessageList({ messages, onDeleteMessage, onCitationClick, onViewAllCitations, isThinking, scrollRef }: MessageListProps) {
  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4">
      <div className="flex flex-col gap-4 pb-4">
        {/* 逐条渲染消息气泡 */}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isUser={msg.role === 'user'}
            onDelete={onDeleteMessage}
            onCitationClick={onCitationClick}
            onViewAllCitations={onViewAllCitations}
          />
        ))}

        {/* AI 思考中动画 */}
        {/* 当 AI 正在生成回复时，显示三个跳动的小圆点和"Thinking..."文字 */}
        {isThinking && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-terracotta-100 flex items-center justify-center shrink-0">
              <span className="text-terracotta-600 text-sm font-bold">AI</span>
            </div>
            <div className="bg-clay-200 rounded-2xl rounded-tl-none px-4 py-3 max-w-[70%] min-w-0 break-words">
              <div className="flex items-center gap-2 text-stone-500">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

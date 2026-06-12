/**
 * @module MessageBubble
 * @description 单条消息气泡组件，支持用户/AI 两种样式、引用标记点击、消息删除等功能
 * @author RETALK Team
 * @date 2026-04
 */

import React, { useState, useRef, useEffect } from 'react'
import type { Message, Citation } from '@/types'
import { formatTime } from '@/lib/utils'

/** MessageBubble 组件的 Props */
interface MessageBubbleProps {
  /** 消息数据对象 */
  message: Message
  /** 是否为用户发送的消息（决定气泡方向和样式） */
  isUser: boolean
  /** 删除消息的回调 */
  onDelete?: (messageId: string) => void
  /** 点击引用标记的回调 */
  onCitationClick?: (citationId: string) => void
  /** 查看消息所有引用的回调 */
  onViewAllCitations?: (citations: Citation[], messageId: string) => void
}

/**
 * 消息气泡组件
 * 用户消息靠右显示，AI 消息靠左显示并支持引用标记和查看所有引用
 */
export default function MessageBubble({ message, isUser, onDelete, onCitationClick, onViewAllCitations }: MessageBubbleProps) {
  /** 右键操作菜单是否显示 */
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击气泡外面的区域时，自动关闭操作菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showMenu])

  /** 删除消息并关闭菜单 */
  const handleDelete = () => {
    onDelete?.(message.id)
    setShowMenu(false)
  }

  /**
   * 渲染消息内容
   * 用户消息直接显示文本；AI 消息需要解析 [1] [2] 等引用标记并转为可点击的按钮
   */
  // AI 的回复里可能有 [1] [2] 这样的引用标记，这里把它们变成可以点击的链接，
  // 点击后就能看到引用的原文出处
  const renderContent = () => {
    if (isUser) return <span>{message.content}</span>

    const citations = message.citations ?? []
    // 用正则表达式把消息文本按 [数字] 格式拆分，普通文本和引用标记交替排列
    const parts = message.content.split(/(\[\d+\])/g)
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/)
      if (match) {
        const num = parseInt(match[1], 10)
        const citation = citations[num - 1]
        return (
          <button
            key={index}
            onClick={() => citation && onCitationClick?.(citation.id)}
            className="text-terracotta-500 hover:text-terracotta-600 hover:underline text-xs align-super cursor-pointer mx-0.5"
          >
            {part}
          </button>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  // ============ 渲染消息气泡 ============
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group max-w-full`}>
      <div
        className={`relative rounded-2xl px-5 py-4 max-w-[70%] min-w-0 break-words overflow-wrap-break-word ${isUser ? 'bg-terracotta-200' : 'bg-clay-200'}`}
      >
        {/* AI 消息顶部标签 */}
        {!isUser && <div className="text-xs text-stone-500 mb-2 font-medium">AI</div>}

        {/* 操作菜单触发按钮（鼠标悬停时显示） */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-clay-300 transition-colors opacity-0 group-hover:opacity-100"
        >
          <span className="text-stone-500 text-lg leading-none">&#8942;</span>
        </button>

        {/* 操作下拉菜单 */}
        {showMenu && (
          <>
            {/* 遮罩层，点击关闭菜单 */}
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div
              ref={menuRef}
              className="absolute right-8 top-8 bg-white border border-clay-300 rounded-xl shadow-lg z-20 w-40 overflow-hidden animate-fade-in"
            >
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-clay-200 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除此消息
              </button>
            </div>
          </>
        )}

        {/* 消息正文内容 */}
        <div className="text-stone-700 whitespace-pre-wrap text-sm leading-relaxed break-words overflow-hidden">
          {renderContent()}
        </div>

        {/* AI 消息底部引用汇总链接 */}
        {(!isUser && message.citations && message.citations.length > 0) && (
          <div className="mt-3 pt-3 border-t border-clay-300">
            <button
              onClick={(e) => { e.stopPropagation(); onViewAllCitations?.(message.citations ?? [], message.id) }}
              className="text-xs text-terracotta-500 hover:text-terracotta-600 hover:underline flex items-center gap-1"
            >
              [{message.citations.map((_, i) => i + 1).join('] [')}] 查看全部引用 →
            </button>
          </div>
        )}

        {/* 消息时间戳 */}
        <div className={`mt-2 text-xs ${isUser ? 'text-stone-500' : 'text-stone-400'}`}>
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  )
}

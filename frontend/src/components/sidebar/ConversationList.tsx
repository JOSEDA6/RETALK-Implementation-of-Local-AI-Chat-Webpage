/**
 * @module ConversationList
 * @description 对话列表组件，展示所有对话并支持选中和删除操作
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import { formatTime } from '@/lib/utils'
import type { Conversation } from '@/types'

/** ConversationList 组件的 Props */
interface ConversationListProps {
  /** 对话数组 */
  conversations: Conversation[]
  /** 当前选中的对话 ID */
  currentConversationId?: string
  /** 选中对话的回调 */
  onSelect: (id: string) => void
  /** 删除对话的回调 */
  onDelete?: (id: string) => void
}

/**
 * 对话列表组件
 * 遍历渲染对话条目，选中项高亮，鼠标悬停显示删除按钮
 */
export default function ConversationList({ conversations, currentConversationId, onSelect, onDelete }: ConversationListProps) {
  /**
   * 删除对话处理
   * 阻止事件冒泡，避免触发选中逻辑
   */
  // 点击删除按钮时，阻止点击事件往上传播，否则会同时触发"选中对话"的操作
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(id)
  }

  // ============ 渲染对话列表 ============
  return (
    <div className="flex flex-col h-full">
      {/* 列表标题 */}
      <div className="p-3 border-b border-clay-300">
        <h3 className="text-xs font-semibold text-stone-500">对话历史</h3>
      </div>

      {/* 对话列表区域 */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="text-center text-stone-400 text-sm py-8">暂无对话历史</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${currentConversationId === conv.id ? 'bg-white shadow-sm' : 'hover:bg-clay-300'}`}
            >
              {/* 对话标题和时间 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700 truncate">💬 {conv.title}</p>
                <p className="text-xs text-stone-400 mt-1">{formatTime(conv.updated_at || conv.created_at)}</p>
              </div>
              {/* 删除按钮（鼠标悬停时显示） */}
              <button
                onClick={(e) => handleDelete(conv.id, e)}
                className="p-1 hover:bg-clay-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

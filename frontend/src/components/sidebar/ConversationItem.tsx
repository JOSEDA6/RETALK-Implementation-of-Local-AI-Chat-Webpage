/**
 * @module ConversationItem
 * @description 单条对话列表项组件，显示对话标题、时间和删除按钮
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import { formatTime } from '@/lib/utils'

/** ConversationItem 组件的 Props */
interface ConversationItemProps {
  /** 对话 ID */
  id: string
  /** 对话标题 */
  title: string
  /** 最后更新时间（ISO 格式） */
  updated_at: string
  /** 是否为当前选中的对话 */
  isActive: boolean
  /** 选中该对话的回调 */
  onSelect: () => void
  /** 删除该对话的回调 */
  onDelete: () => void
}

/**
 * 对话列表项组件
 * 选中时高亮显示，鼠标悬停时显示删除按钮
 */
export default function ConversationItem({ id, title, updated_at, isActive, onSelect, onDelete }: ConversationItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
        ${isActive ? 'bg-white shadow-sm' : 'hover:bg-clay-300'}`}
    >
      {/* 对话标题和时间 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-700 truncate">💬 {title}</p>
        <p className="text-xs text-stone-400 mt-1">{formatTime(updated_at)}</p>
      </div>
      {/* 删除按钮（鼠标悬停时显示） */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="p-1 hover:bg-clay-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

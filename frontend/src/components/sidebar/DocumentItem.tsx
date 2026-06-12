/**
 * @module DocumentItem
 * @description 单条文档列表项组件，显示文档标题、大小、处理状态和删除按钮
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import { formatFileSize } from '@/lib/utils'

/** DocumentItem 组件的 Props */
interface DocumentItemProps {
  /** 文档 ID */
  id: string
  /** 文档标题 */
  title: string
  /** 文件大小（字节） */
  file_size: number
  /** 文档处理状态 */
  status: string
  /** 文档切片数量 */
  chunk_count?: number
  /** 选中该文档的回调 */
  onSelect?: () => void
  /** 删除该文档的回调 */
  onDelete?: () => void
}

/**
 * 文档列表项组件
 * 显示文档图标、标题、大小、状态徽章和片段数，已解析的文档可删除
 */
export default function DocumentItem({ id, title, file_size, status, chunk_count, onSelect, onDelete }: DocumentItemProps) {
  /**
   * 根据文档状态返回对应的状态徽章
   */
  // 根据文档的处理状态显示不同颜色的标签，让用户一眼看出文档有没有处理好
  const getStatusBadge = () => {
    switch (status) {
      case 'parsed': return <span className="text-xs text-green-500">✓ 已解析</span>
      case 'uploading': return <span className="text-xs text-terracotta-500">上传中</span>
      case 'parsing': return <span className="text-xs text-stone-400">处理中</span>
      case 'failed': return <span className="text-xs text-red-500">失败</span>
      default: return <span className="text-xs text-stone-400">已上传</span>
    }
  }

  // ============ 渲染文档列表项 ============
  return (
    <div
      onClick={onSelect}
      className="group flex items-center justify-between gap-3 p-3 rounded-lg border border-clay-200 hover:border-terracotta-300 hover:bg-terracotta-50 cursor-pointer transition-colors"
    >
      {/* 文档图标和信息 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl">📄</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-stone-700 truncate">{title}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-stone-400">{formatFileSize(file_size)}</span>
            {getStatusBadge()}
            <span className="text-xs text-stone-400">({chunk_count ?? 0} 片段)</span>
          </div>
        </div>
      </div>
      {/* 删除按钮（仅已解析的文档显示） */}
      {/* 只有已经解析完成的文档才能删除，正在处理中的不能删 */}
      {status === 'parsed' && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.() }}
          className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-500 text-xs rounded transition-all"
        >
          删除
        </button>
      )}
    </div>
  )
}

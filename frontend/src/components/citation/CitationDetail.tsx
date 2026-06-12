/**
 * @module CitationDetail
 * @description 引用详情展示组件，显示单条引用的完整信息（文档标题、页码、内容片段、片段 ID）
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import type { Citation } from '@/types'

/** CitationDetail 组件的 Props */
interface CitationDetailProps {
  /** 要展示的引用数据 */
  citation: Citation
  /** 关闭详情视图的回调 */
  onClose?: () => void
}

/**
 * 引用详情组件
 * 以卡片形式展示引用的文档标题、页码、原文内容和内部片段 ID
 */
// 这个组件就是把一条引用的所有信息（来自哪篇文档、第几页、原文是什么）展示出来
export default function CitationDetail({ citation, onClose }: CitationDetailProps) {
  return (
    <div className="p-4">
      {/* 顶部：标签和关闭按钮 */}
      <div className="flex items-center justify-between mb-4">
        <span className="px-2 py-1 rounded-md bg-terracotta-100 text-terracotta-600 text-xs font-medium">
          引用来源
        </span>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-clay-100 rounded-md transition-colors">
            <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 文档标题 */}
      <h2 className="text-lg font-semibold text-stone-700 mb-3">{citation.document_title}</h2>

      {/* 引用详细信息 */}
      <div className="space-y-3">
        {/* 页码信息（可选） */}
        {citation.page && (
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">页码</label>
            <p className="text-sm text-stone-700 mt-0.5">第 {citation.page} 页</p>
          </div>
        )}

        {/* 引用原文内容 */}
        <div>
          <label className="text-xs text-stone-500 uppercase tracking-wider">内容片段</label>
          <p className="text-sm text-stone-600 mt-0.5 leading-relaxed bg-white p-3 rounded-lg border border-clay-300">
            {citation.content}
          </p>
        </div>

        {/* 内部片段 ID（供调试或高级用户参考） */}
        <div>
          <label className="text-xs text-stone-500 uppercase tracking-wider">片段 ID</label>
          <p className="text-sm text-stone-700 mt-0.5 font-mono text-xs">{citation.chunk_id}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * @module CitationPanel
 * @description 引用详情面板组件，在主界面右侧展示引用列表或单条引用详情，支持导出
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import type { Citation } from '@/types'
import { useExportCitation } from '@/hooks/useCitation'

/** CitationPanel 组件的 Props */
interface CitationPanelProps {
  /** 要展示的引用列表 */
  citations: Citation[]
  /** 面板是否打开 */
  isOpen: boolean
  /** 关闭面板的回调 */
  onClose: () => void
  /** 选中的单条引用（有值时显示详情视图） */
  selectedCitation?: Citation
  /** 关联的消息 ID，用于导出引用时定位消息 */
  messageId?: string
}

/**
 * 引用详情面板
 * 两种视图模式：
 * 1. selectedCitation 有值时显示单条引用详情 + 导出按钮
 * 2. 否则显示引用列表概览
 */
export default function CitationPanel({ citations, isOpen, onClose, selectedCitation, messageId }: CitationPanelProps) {
  // 导出引用的操作器，可以把引用导出成 BibTeX 或国标格式
  const exportMutation = useExportCitation()

  /** 导出引用处理 */
  const handleExport = async (format: 'bibtex' | 'gbt7714') => {
    if (messageId) {
      await exportMutation.mutateAsync({ messageId, format })
    }
  }

  // 面板没打开就什么都不渲染
  if (!isOpen) return null

  // ============ 渲染引用面板 ============
  return (
    <aside className="w-80 bg-white border-l border-clay-300 flex flex-col shrink-0 panel-transition">
      {/* 面板顶部：标题和关闭按钮 */}
      <div className="h-14 border-b border-clay-300 flex items-center justify-between px-4">
        <h2 className="font-semibold text-stone-700">引用详情</h2>
        <button onClick={onClose} className="p-1 hover:bg-clay-200 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 面板内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {citations.length === 0 ? (
          <div className="text-center text-stone-400 text-sm py-8">暂无引用</div>
        ) : (
          <div className="space-y-4">
            {selectedCitation ? (
              /* ---- 单条引用详情视图 ---- */
              <div className="bg-clay-100 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  {/* 引用编号圆圈 */}
                  <span className="w-6 h-6 bg-terracotta-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <div>
                    <h3 className="font-medium text-stone-700">{selectedCitation.document_title}</h3>
                    {selectedCitation.page && <p className="text-sm text-stone-500 mt-1">第 {selectedCitation.page} 页</p>}
                  </div>
                </div>
                {/* 引用原文内容 */}
                <p className="text-sm text-stone-600 bg-white rounded-lg p-3 border border-clay-300 leading-relaxed">
                  {selectedCitation.content}
                </p>
                {/* 导出按钮 */}
                {/* 两个导出按钮，分别把引用导出成 BibTeX 格式（国际通用）和 GB/T 7714 格式（国内标准） */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleExport('bibtex')}
                    disabled={exportMutation.isPending}
                    className="flex-1 px-3 py-2 bg-clay-200 hover:bg-clay-300 disabled:opacity-50 text-stone-700 text-sm rounded-lg transition-colors"
                  >
                    BibTeX
                  </button>
                  <button
                    onClick={() => handleExport('gbt7714')}
                    disabled={exportMutation.isPending}
                    className="flex-1 px-3 py-2 bg-clay-200 hover:bg-clay-300 disabled:opacity-50 text-stone-700 text-sm rounded-lg transition-colors"
                  >
                    GB/T 7714
                  </button>
                </div>
              </div>
            ) : (
              /* ---- 引用列表概览视图 ---- */
              // 显示所有引用的列表，每条引用显示编号、文档标题、页码和内容摘要
              citations.map((citation, index) => (
                <div key={citation.id} className="bg-clay-100 rounded-xl p-4 cursor-pointer hover:bg-clay-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-terracotta-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-stone-700">{citation.document_title}</h3>
                      {citation.page && <p className="text-sm text-stone-500 mt-1">第 {citation.page} 页</p>}
                      <p className="text-sm text-stone-600 mt-2 line-clamp-3">{citation.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

/**
 * @module CitationExport
 * @description 引用导出弹窗组件，支持将引用导出为 BibTeX 或 GB/T 7714 格式并下载
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import { useExportCitation } from '@/hooks/useCitation'

/** CitationExport 组件的 Props */
interface CitationExportProps {
  /** 要导出引用的消息 ID */
  messageId: string
  /** 关闭弹窗的回调 */
  onClose: () => void
}

/**
 * 引用导出弹窗组件
 * 以模态框形式展示导出格式选项，点击后生成文件并触发浏览器下载
 */
export default function CitationExport({ messageId, onClose }: CitationExportProps) {
  // 导出引用的操作器，调用后端接口生成引用格式文本
  const exportMutation = useExportCitation()

  /** 支持的导出格式列表 */
  const formats = [
    { id: 'bibtex', name: 'BibTeX', ext: '.bib' },
    { id: 'gbt7714', name: 'GB/T 7714', ext: '.txt' },
  ]

  /**
   * 导出引用处理
   * 调用后端接口获取格式化文本，然后创建 Blob 触发浏览器下载
   */
  // 先从后端拿到格式化好的引用文本，然后在浏览器里创建一个临时文件让用户下载
  const handleExport = async (format: 'bibtex' | 'gbt7714') => {
    try {
      const content = await exportMutation.mutateAsync({ messageId, format })
      // 把文本内容变成一个可下载的文件，自动触发浏览器的下载功能
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `citations.${formats.find(f => f.id === format)?.ext || 'txt'}`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // ============ 渲染导出弹窗 ============
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-fade-in">
        {/* 弹窗顶部：标题和关闭按钮 */}
        <div className="flex items-center justify-between p-4 border-b border-clay-200">
          <h3 className="font-semibold text-stone-700">导出引用</h3>
          <button onClick={onClose} className="p-1 hover:bg-clay-100 rounded-md transition-colors">
            <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 格式选择列表 */}
        <div className="p-4">
          <p className="text-sm text-stone-500 mb-4">导出格式选择</p>
          <div className="space-y-2">
            {formats.map((format) => (
              <button
                key={format.id}
                onClick={() => handleExport(format.id as 'bibtex' | 'gbt7714')}
                disabled={exportMutation.isPending}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-clay-200 hover:border-terracotta-300 hover:bg-terracotta-50 transition-colors disabled:opacity-50"
              >
                {/* 格式图标和名称 */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-clay-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-stone-700">{format.name}</p>
                    <p className="text-xs text-stone-400">{format.ext}</p>
                  </div>
                </div>
                {/* 右箭头 */}
                <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

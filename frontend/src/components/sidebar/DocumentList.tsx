/**
 * @module DocumentList
 * @description 文档列表组件，展示用户上传的所有文档，集成上传区域和删除功能
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import { useDocumentList, useDeleteDocument } from '@/hooks/useDocument'
import { formatFileSize } from '@/lib/utils'
import UploadZone from './UploadZone'

/** DocumentList 组件的 Props */
interface DocumentListProps {
  /** 选中文档的回调 */
  onSelectDocument?: (id: string) => void
}

/**
 * 文档列表组件
 * 顶部为上传区域，下方为文档列表，每个文档显示标题、大小、状态和删除按钮
 */
export default function DocumentList({ onSelectDocument }: DocumentListProps) {
  // 从后端拉取文档列表数据，没有文档时返回空数组
  const { data: documents = [] } = useDocumentList()
  const deleteDocumentMutation = useDeleteDocument()

  /**
   * 删除文档处理
   * 阻止事件冒泡，避免触发选中逻辑
   */
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteDocumentMutation.mutateAsync(id)
  }

  /**
   * 根据文档状态返回对应的状态徽章
   */
  // 根据状态显示不同颜色的标签，比如绿色表示解析完成，红色表示失败
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'parsed': return <span className="text-xs text-green-500">✓ 已解析</span>
      case 'uploading': return <span className="text-xs text-terracotta-500">上传中</span>
      case 'parsing': return <span className="text-xs text-stone-400">处理中</span>
      case 'failed': return <span className="text-xs text-red-500">失败</span>
      default: return <span className="text-xs text-stone-400">已上传</span>
    }
  }

  // ============ 渲染文档列表 ============
  return (
    <div className="flex flex-col h-full">
      {/* 列表标题 */}
      <div className="p-3 border-b border-clay-300">
        <h3 className="text-xs font-semibold text-stone-500">知识库</h3>
      </div>

      {/* 上传区域和文档列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <UploadZone />
        {documents.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-stone-400 text-sm">暂无文档</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                onClick={() => onSelectDocument?.(doc.id)}
                className="group flex items-center justify-between gap-3 p-3 rounded-lg border border-clay-200 hover:border-terracotta-300 hover:bg-terracotta-50 cursor-pointer transition-colors"
              >
                {/* 文档图标和信息 */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-stone-700 truncate">{doc.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-stone-400">{formatFileSize(doc.file_size)}</span>
                      {getStatusBadge(doc.status)}
                      <span className="text-xs text-stone-400">({doc.chunk_count ?? 0} 片段)</span>
                    </div>
                  </div>
                </div>
                {/* 删除按钮（仅已解析的文档显示） */}
                {doc.status === 'parsed' && (
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-500 text-xs rounded transition-all"
                  >
                    删除
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * @module Sidebar
 * @description 侧边栏组件，包含"对话"和"知识库"两个 Tab 面板，支持折叠模式
 * @author RETALK Team
 * @date 2026-04
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useConversationList, useDeleteConversation, useCreateConversation } from '@/hooks/useConversation'
import { useDocumentList, useDeleteDocument } from '@/hooks/useDocument'
import { formatTime, formatRelativeDate, formatFileSize } from '@/lib/utils'
import UploadZone from '@/components/sidebar/UploadZone'

/** Sidebar 组件的 Props */
interface SidebarProps {
  /** 当前选中的对话 ID */
  currentConversationId?: string
  /** 选择对话的回调 */
  onSelectConversation: (id: string) => void
  /** 是否处于折叠状态 */
  isCollapsed?: boolean
  /** 切换折叠状态的回调 */
  onToggleCollapse?: () => void
}

/** 侧边栏 Tab 类型 */
type SidebarTab = 'conversations' | 'documents'

/**
 * 侧边栏组件
 * 展开模式下有完整的对话列表和文档列表；折叠模式下只显示图标按钮
 */
export default function Sidebar({
  currentConversationId,
  onSelectConversation,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  /** 当前激活的 Tab */
  const [activeTab, setActiveTab] = useState<SidebarTab>('conversations')
  /** 正在显示删除菜单的对话 ID */
  const [deleteMenuId, setDeleteMenuId] = useState<string | null>(null)
  /** 正在显示删除菜单的文档 ID */
  const [docMenuId, setDocMenuId] = useState<string | null>(null)

  // 从后端拉取对话列表和文档列表
  const { data: conversations = [] } = useConversationList()
  const { data: documents = [] } = useDocumentList()
  const deleteConversationMutation = useDeleteConversation()
  const deleteDocumentMutation = useDeleteDocument()
  const createConversationMutation = useCreateConversation()

  // ============ 点击外部区域关闭菜单 ============
  const sidebarRef = useRef<HTMLDivElement>(null)

  // 点击侧边栏外面的区域时，自动关闭正在显示的删除菜单
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
      setDeleteMenuId(null)
      setDocMenuId(null)
    }
  }, [])

  // 只有在有菜单打开时才监听全局点击事件，菜单关闭后自动取消监听
  useEffect(() => {
    if (deleteMenuId || docMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [deleteMenuId, docMenuId, handleClickOutside])

  // ============ 对话分组逻辑 ============
  // 把对话按日期分组（今天、昨天、7天前、更早），方便用户按时间查找
  const groupedConversations = conversations.reduce((acc, conv) => {
    const date = formatRelativeDate(conv.updated_at || conv.created_at)
    if (!acc[date]) acc[date] = []
    acc[date].push(conv)
    return acc
  }, {} as Record<string, typeof conversations>)

  // 确保分组按照"今天 > 昨天 > 7天前 > 更早"的顺序排列
  const groupOrder = ['今天', '昨天', '7 天前', '更早']
  const orderedGroups = Object.entries(groupedConversations).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a[0])
    const bIndex = groupOrder.indexOf(b[0])
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  // ============ 事件处理函数 ============

  /** 创建新对话并自动选中 */
  const handleCreateConversation = async () => {
    const conv = await createConversationMutation.mutateAsync()
    onSelectConversation(conv.id)
  }

  /** 删除对话，如果删除的是当前对话则清除选中状态 */
  const handleDeleteConversation = async (id: string) => {
    console.log('[Sidebar] Deleting conversation:', id)
    setDeleteMenuId(null)
    try {
      await deleteConversationMutation.mutateAsync(id)
      console.log('[Sidebar] Delete successful:', id)
      // 如果删掉的正好是当前正在看的对话，就把选中状态清空
      if (id === currentConversationId) {
        onSelectConversation(undefined as any)
      }
    } catch (err: any) {
      console.error('[Sidebar] Delete failed:', err?.message || err)
    }
  }

  /** 删除文档 */
  const handleDeleteDocument = async (id: string) => {
    setDocMenuId(null)
    try {
      await deleteDocumentMutation.mutateAsync(id)
    } catch (err: any) {
      console.error('[Sidebar] Document delete failed:', err?.message || err)
    }
  }

  // ============ 折叠模式 — 只显示图标按钮 ============
  if (isCollapsed) {
    return (
      <aside className="w-16 bg-clay-200 border-r border-clay-300 flex flex-col items-center py-4 shrink-0">
        <button onClick={() => setActiveTab('conversations')} className={`p-2 rounded-lg mb-4 ${activeTab === 'conversations' ? 'bg-terracotta-500 text-white' : 'hover:bg-clay-300 text-stone-600'}`} title="对话">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        <button onClick={() => setActiveTab('documents')} className={`p-2 rounded-lg mb-4 ${activeTab === 'documents' ? 'bg-terracotta-500 text-white' : 'hover:bg-clay-300 text-stone-600'}`} title="知识库">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 0 1 1 .707 .293l5.414 5.414a1 0 1 1 .293 .707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button onClick={handleCreateConversation} className="p-2 hover:bg-terracotta-500 hover:text-white rounded-lg text-stone-600" title="新对话">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </aside>
    )
  }

  // ============ 展开模式 — 完整侧边栏 ============
  return (
    <aside className="w-72 bg-clay-200 border-r border-clay-300 flex flex-col shrink-0 transition-all duration-250" ref={sidebarRef}>
      {/* Tab 切换器 */}
      <div className="flex border-b border-clay-300">
        <button
          onClick={() => setActiveTab('conversations')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'conversations' ? 'bg-white text-terracotta-600 border-b-2 border-terracotta-500' : 'text-stone-600 hover:text-stone-700'}`}
        >
          对话
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'documents' ? 'bg-white text-terracotta-600 border-b-2 border-terracotta-500' : 'text-stone-600 hover:text-stone-700'}`}
        >
          知识库
        </button>
      </div>

      {/* ============ 对话面板 ============ */}
      {activeTab === 'conversations' && (
        <div className="flex flex-col h-full">
          {/* 新建对话按钮 */}
          <div className="p-2">
            <button
              onClick={handleCreateConversation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建对话
            </button>
          </div>

          {/* 按日期分组的对话列表 */}
          <div className="flex-1 overflow-y-auto p-2">
            {orderedGroups.length === 0 ? (
              <div className="text-center text-stone-400 text-sm py-8">暂无对话历史</div>
            ) : (
              orderedGroups.map(([label, convs]) => (
                <div key={label} className="mb-4">
                  {/* 日期分组标签 */}
                  <h3 className="text-xs font-medium text-stone-500 px-3 mb-2">{label}</h3>
                  {convs.map((conv) => (
                    <div
                      key={conv.id}
                      className={`relative group px-3 py-2 rounded-lg cursor-pointer transition-colors ${currentConversationId === conv.id ? 'bg-white shadow-sm' : 'hover:bg-clay-300'}`}
                      onClick={() => onSelectConversation(conv.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-700 truncate">{conv.title}</p>
                          <p className="text-xs text-stone-400 mt-1">{formatTime(conv.updated_at || conv.created_at)}</p>
                        </div>
                        {/* 操作菜单按钮 */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDeleteMenuId(deleteMenuId === conv.id ? null : conv.id) }}
                            className="p-1 hover:bg-clay-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <span className="text-stone-500 text-lg leading-none">&#8942;</span>
                          </button>
                          {/* 删除确认菜单 */}
                          {deleteMenuId === conv.id && (
                            <div className="absolute right-0 top-6 bg-white border border-clay-300 rounded-xl shadow-lg z-20 w-32 overflow-hidden animate-fade-in">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id) }}
                                className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-clay-200 transition-colors"
                              >
                                删除
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============ 文档面板 ============ */}
      {activeTab === 'documents' && (
        <div className="flex-1 overflow-y-auto p-4">
          {/* 文件上传区域 */}
          <UploadZone />
          {/* 文档列表 */}
          <div className="mt-3 space-y-2">
            {documents.length === 0 ? (
              <div className="text-center text-stone-400 text-sm py-8">暂无文档</div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between text-xs p-2 bg-white rounded-lg group">
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-600 truncate">{doc.title}</p>
                    <p className="text-stone-400">{formatFileSize(doc.file_size)} · {doc.status === 'parsed' ? `已解析 ${doc.chunk_count ?? 0} 段` : doc.status}</p>
                  </div>
                  {/* 文档操作菜单 */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDocMenuId(docMenuId === doc.id ? null : doc.id) }}
                      className="p-1 hover:bg-clay-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="text-stone-500 text-lg leading-none">&#8942;</span>
                    </button>
                    {docMenuId === doc.id && (
                      <div className="absolute right-0 top-6 bg-white border border-clay-300 rounded-xl shadow-lg z-20 w-32 overflow-hidden animate-fade-in">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id) }}
                          className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-clay-200 transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

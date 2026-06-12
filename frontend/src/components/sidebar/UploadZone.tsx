/**
 * @module UploadZone
 * @description 文件上传区域组件，支持点击选择和拖拽上传 PDF/DOCX 文件
 * @author RETALK Team
 * @date 2026-04
 */

import React, { useState, useRef, useEffect } from 'react'
import { useUploadDocument } from '@/hooks/useDocument'
import { formatFileSize } from '@/lib/utils'

/** UploadZone 组件的 Props */
interface UploadZoneProps {
  /** 上传完成后的回调 */
  onUploadComplete?: () => void
}

/**
 * 文件上传区域组件
 * 支持两种上传方式：点击选择文件 和 拖拽文件到区域
 */
export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  /** 是否正在拖拽文件到区域上方（用于高亮样式） */
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // useUploadDocument 返回一个"上传操作器"，调用它的 mutate 就能上传文件
  const uploadMutation = useUploadDocument()

  /**
   * 处理选中的文件列表
   * 遍历所有文件并逐一上传
   */
  // 拿到用户选的文件后，一个个调用上传接口发送到后端
  const handleFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      uploadMutation.mutate({
        file,
        onProgress: (progress) => {},
      })
    })
    onUploadComplete?.()
  }

  // ============ 拖拽事件处理 ============

  /** 文件拖放到区域时触发上传 */
  // 用户把文件拖到这个区域松开鼠标时，自动开始上传
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  /** 文件拖动经过区域时高亮显示 */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  /** 文件拖出区域时取消高亮 */
  const handleDragLeave = () => {
    setIsDragging(false)
  }

  // ============ 点击上传处理 ============

  /** 点击区域时打开文件选择对话框 */
  const handleClick = () => {
    inputRef.current?.click()
  }

  /** 文件选择对话框选中文件后触发上传 */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  // ============ 渲染上传区域 ============
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
        ${isDragging ? 'border-terracotta-500 bg-terracotta-50' : 'border-clay-300 hover:border-terracotta-400 hover:bg-clay-100'}`}
    >
      {/* 隐藏的文件选择 input */}
      <input ref={inputRef} type="file" multiple accept=".pdf,.docx" onChange={handleChange} className="hidden" />

      {/* 上传图标 */}
      <svg className="w-8 h-8 mx-auto text-stone-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>

      {/* 上传提示文本 */}
      <p className="text-sm text-stone-600">
        <span className="font-medium text-terracotta-500">点击上传</span> 或拖拽文件到此处
      </p>
      <p className="text-xs text-stone-400 mt-1">支持 PDF、DOCX 格式</p>

      {/* 上传进度条（上传中时显示） */}
      {/* 上传文件的时候，底部会出现一个进度条让用户知道上传到哪了 */}
      {uploadMutation.isPending && (
        <div className="mt-3">
          <div className="h-1 bg-clay-300 rounded-full overflow-hidden">
            <div className="h-full bg-terracotta-500 progress-bar-transition" style={{ width: '50%' }} />
          </div>
          <p className="text-xs text-stone-500 mt-1">上传中...</p>
        </div>
      )}
    </div>
  )
}

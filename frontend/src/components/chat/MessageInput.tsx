/**
 * @module MessageInput
 * @description 消息输入框组件，支持多行输入、Enter 发送、Shift+Enter 换行和自动高度调整
 * @author RETALK Team
 * @date 2026-04
 */

import React, { useState, useRef } from 'react'

/** MessageInput 组件的 Props */
interface MessageInputProps {
  /** 发送消息的回调 */
  onSend: (content: string) => Promise<void>
  /** 是否禁用输入框（如正在发送时） */
  disabled?: boolean
  /** 自定义占位文本 */
  placeholder?: string
}

/**
 * 消息输入组件
 * 提供自适应高度的文本框、快捷键发送和发送按钮
 */
export default function MessageInput({ onSend, disabled = false, placeholder }: MessageInputProps) {
  /** 输入框的文本值 */
  const [value, setValue] = useState('')
  /** 是否正在发送（防止重复提交） */
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /**
   * 提交消息处理
   * 去除首尾空格，发送后清空输入框并重置高度
   */
  const handleSubmit = async () => {
    // 输入为空、被禁用、或者正在发送中，都不执行发送
    if (!value.trim() || disabled || isSending) return
    setIsSending(true)
    try {
      await onSend(value.trim())
      setValue('')
      // 发送成功后，把输入框高度重置回一行的高度
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } finally {
      setIsSending(false)
    }
  }

  /**
   * 键盘事件处理
   * Enter 发送消息，Shift+Enter 换行
   */
  // 按 Enter 就发送消息，按 Shift+Enter 就换行（写多行内容时用）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  /**
   * 输入变化处理
   * 更新文本值并自动调整文本框高度（最高 200px）
   */
  // 输入内容变化时，自动调整文本框的高度来适应内容，最多长到 200 像素
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
  }

  // ============ 渲染输入区域 ============
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
      className="flex items-end gap-2 w-full"
    >
      {/* 文本输入框 */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '输入你的问题，按 Enter 发送，Shift+Enter 换行'}
          disabled={disabled || isSending}
          rows={1}
          className="w-full resize-none rounded-xl border-2 border-clay-400 focus:border-terracotta-500 outline-none px-4 py-3 pr-12 text-stone-700 placeholder-stone-400 disabled:bg-clay-200 disabled:text-stone-400 transition-colors"
          style={{ minHeight: '48px', maxHeight: '200px' }}
        />
      </div>

      {/* 发送按钮 */}
      <button
        type="submit"
        disabled={disabled || isSending || !value.trim()}
        className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-terracotta-500 hover:bg-terracotta-600 disabled:bg-clay-300 disabled:cursor-not-allowed text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  )
}

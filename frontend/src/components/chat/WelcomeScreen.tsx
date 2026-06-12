/**
 * @module WelcomeScreen
 * @description 欢迎屏组件，在用户未开始对话时显示品牌信息和快捷问题
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import MessageInput from './MessageInput'

/** WelcomeScreen 组件的 Props */
interface WelcomeScreenProps {
  /** 点击快捷问题时的回调 */
  onSendQuickQuestion?: (question: string) => void
  /** 直接发送消息的回调（用于底部输入框） */
  onSendMessage?: (message: string) => Promise<void>
}

/**
 * 欢迎屏组件
 * 展示 RETALK 品牌 Logo、欢迎语和四个常用快捷问题按钮
 */
export default function WelcomeScreen({ onSendQuickQuestion, onSendMessage }: WelcomeScreenProps) {
  // 预设四个学术研究中常用的问题，用户可以直接点击来快速开始对话
  const quickQuestions = [
    '这篇论文的主要贡献是什么？',
    '作者使用了什么研究方法？',
    '与相关研究相比有什么优势？',
    '帮我总结论文的实验结果',
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      {/* Logo 与品牌信息 */}
      <div className="w-16 h-16 bg-terracotta-500 rounded-2xl flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L4 9v12h16V9l-8-6z"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-stone-700 mb-2">欢迎使用 RETALK</h1>
      <p className="text-stone-500 mb-8">Research Talk · AI 学术对话平台</p>

      {/* 快捷问题按钮网格 */}
      {/* 四个快捷问题按钮排成两列，点击任意一个就能直接开始提问 */}
      <div className="grid grid-cols-2 gap-3 mb-8 w-full max-w-2xl">
        {quickQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSendQuickQuestion?.(q)}
            className="p-4 text-left text-sm bg-white hover:bg-terracotta-50 border border-clay-300 hover:border-terracotta-400 rounded-xl transition-colors text-stone-600 hover:text-stone-700"
          >
            → {q}
          </button>
        ))}
      </div>

      {/* 可选的底部输入框 */}
      <div className="w-full max-w-2xl">
        {onSendMessage && <MessageInput onSend={onSendMessage} placeholder="输入你的问题... (Shift+Enter 换行)" />}
      </div>
    </div>
  )
}

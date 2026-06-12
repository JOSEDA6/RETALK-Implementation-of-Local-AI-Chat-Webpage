/**
 * @module Header
 * @description 顶部导航栏组件，展示品牌 Logo、用户信息和退出登录按钮
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import { useLogout, useCurrentUser } from '@/hooks/useAuth'

/** Header 组件的 Props */
interface HeaderProps {
  /** 点击"登录"按钮的回调（未登录时显示） */
  onLoginClick?: () => void
  /** 退出登录的回调 */
  onLogout?: () => void
}

/**
 * 顶部导航栏组件
 * 已登录时显示用户头像和退出按钮，未登录时显示登录按钮
 */
export default function Header({ onLoginClick, onLogout }: HeaderProps) {
  // 获取当前登录用户信息，如果没登录 user 就是 null
  const { data: user } = useCurrentUser()
  const logoutMutation = useLogout()

  /** 退出登录处理 */
  const handleLogout = () => {
    // 先调用注销 Hook 清理本地数据，再通知父组件执行额外的退出逻辑
    logoutMutation.mutate()
    onLogout?.()
  }

  // ============ 渲染导航栏 ============
  return (
    <header className="h-14 border-b border-clay-300 bg-white flex items-center justify-between px-4 shrink-0">
      {/* 左侧：Logo 和品牌名 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-terracotta-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L4 9v12h16V9l-8-6z"/>
          </svg>
        </div>
        <h1 className="text-terracotta-600 font-bold text-lg">RETALK</h1>
        <span className="text-stone-500 text-sm hidden sm:inline">文献对话助手</span>
      </div>

      {/* 右侧：用户信息或登录按钮 */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            {/* 用户头像（取用户名首字母）和用户名 */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-terracotta-100 flex items-center justify-center">
                <span className="text-terracotta-600 text-sm font-medium">{user.username.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-stone-700 text-sm hidden sm:inline">{user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-stone-500 hover:text-stone-700 text-sm transition-colors"
            >
              退出
            </button>
          </>
        ) : (
          <button
            onClick={onLoginClick}
            className="bg-terracotta-500 hover:bg-terracotta-600 text-white px-4 py-1.5 rounded-lg text-sm transition-colors button-hover-transition"
          >
            登录
          </button>
        )}
      </div>
    </header>
  )
}

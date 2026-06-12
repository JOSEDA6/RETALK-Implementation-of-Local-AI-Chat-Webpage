/**
 * @module LoginForm
 * @description 用户登录表单组件，提供用户名/密码输入、记住登录和表单校验功能
 * @author RETALK Team
 * @date 2026-04
 */

import React, { useState } from 'react'
import { useLogin } from '@/hooks/useAuth'
import { isValidUsername, isValidPassword } from '@/lib/utils'

/** LoginForm 组件的 Props */
interface LoginFormProps {
  /** 切换到注册表单的回调 */
  onSwitchToRegister: () => void
  /** 登录成功后的回调 */
  onSuccess?: () => void
}

/**
 * 登录表单组件
 * 包含用户名、密码输入框，"记住我"选项和表单校验逻辑
 */
export default function LoginForm({ onSwitchToRegister, onSuccess }: LoginFormProps) {
  /** 用户名输入值 */
  const [username, setUsername] = useState('')
  /** 密码输入值 */
  const [password, setPassword] = useState('')
  /** 是否勾选"7 天内自动登录" */
  const [rememberMe, setRememberMe] = useState(false)
  /** 表单校验或登录失败的错误提示 */
  const [error, setError] = useState('')

  // useLogin 返回一个"登录操作器"，调用它的 mutateAsync 就能发起登录请求
  const loginMutation = useLogin()

  /**
   * 表单提交处理
   * 先校验输入，通过后调用登录接口
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 先检查用户名和密码格式对不对，不对就直接显示错误，不发请求
    if (!isValidUsername(username)) {
      setError('用户名至少 3 个字符')
      return
    }

    if (!isValidPassword(password)) {
      setError('密码至少 6 个字符')
      return
    }

    try {
      // 校验通过后，把用户名、密码和"记住我"发给后端进行登录
      await loginMutation.mutateAsync({ username, password, remember: rememberMe })
      onSuccess?.()
    } catch (err) {
      setError('登录失败，请检查用户名和密码')
    }
  }

  // ============ 渲染登录表单 UI ============
  return (
    <div className="w-full max-w-md mx-auto p-8 bg-clay-100 rounded-2xl shadow-lg">
      {/* Logo 区域 */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-terracotta-500 rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L4 9v12h16V9l-8-6z"/>
          </svg>
        </div>
      </div>

      {/* 标题与副标题 */}
      <h1 className="text-2xl font-bold text-stone-700 text-center mb-2">欢迎使用 RETALK</h1>
      <p className="text-stone-500 text-center mb-6 text-sm">Research Talk · AI 学术对话平台</p>

      {/* 登录/注册 Tab 切换 */}
      <div className="flex mb-6 border-b border-clay-300">
        <button className="flex-1 py-3 text-stone-700 font-medium border-b-2 border-terracotta-500">登录</button>
        <button onClick={onSwitchToRegister} className="flex-1 py-3 text-stone-500 hover:text-stone-700 transition-colors">注册</button>
      </div>

      {/* 表单主体 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-stone-700 mb-2">用户名</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入用户名"
            className="w-full h-10 px-4 border border-clay-400 rounded-xl focus:border-2 focus:border-terracotta-500 outline-none text-stone-700 placeholder-stone-400" />
        </div>
        <div>
          <label className="block text-sm text-stone-700 mb-2">密码</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码"
            className="w-full h-10 px-4 border border-clay-400 rounded-xl focus:border-2 focus:border-terracotta-500 outline-none text-stone-700 placeholder-stone-400" />
        </div>
        <div className="flex items-center">
          <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 border-clay-400 rounded text-terracotta-500 focus:ring-terracotta-500" />
          <label htmlFor="remember" className="ml-2 text-sm text-stone-600">7 天内自动登录</label>
        </div>

        {/* 错误提示 */}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* 提交按钮 */}
        <button type="submit" disabled={loginMutation.isPending}
          className="w-full h-11 bg-terracotta-500 text-white font-medium rounded-xl hover:bg-terracotta-600 disabled:opacity-50 transition-colors">
          {loginMutation.isPending ? '登录中...' : '登 录'}
        </button>
      </form>
    </div>
  )
}

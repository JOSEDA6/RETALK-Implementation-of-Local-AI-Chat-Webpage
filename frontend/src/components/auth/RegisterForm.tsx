/**
 * @module RegisterForm
 * @description 用户注册表单组件，提供用户名/密码/确认密码输入和表单校验功能
 * @author RETALK Team
 * @date 2026-04
 */

import React, { useState } from 'react'
import { useRegister } from '@/hooks/useAuth'
import { isValidUsername, isValidPassword } from '@/lib/utils'

/** RegisterForm 组件的 Props */
interface RegisterFormProps {
  /** 切换到登录表单的回调 */
  onSwitchToLogin: () => void
  /** 注册成功后的回调 */
  onSuccess?: () => void
}

/**
 * 注册表单组件
 * 包含用户名、密码、确认密码输入框和完整的表单校验
 */
export default function RegisterForm({ onSwitchToLogin, onSuccess }: RegisterFormProps) {
  /** 用户名输入值 */
  const [username, setUsername] = useState('')
  /** 密码输入值 */
  const [password, setPassword] = useState('')
  /** 确认密码输入值 */
  const [confirmPassword, setConfirmPassword] = useState('')
  /** 表单校验或注册失败的错误提示 */
  const [error, setError] = useState('')

  // useRegister 返回一个"注册操作器"，调用它的 mutateAsync 就能发起注册请求
  const registerMutation = useRegister()

  /**
   * 表单提交处理
   * 依次校验用户名、密码和确认密码，通过后调用注册接口
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 依次检查用户名格式、密码长度、两次密码是否一致
    if (!isValidUsername(username)) {
      setError('用户名至少 3 个字符')
      return
    }

    if (!isValidPassword(password)) {
      setError('密码至少 6 个字符')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    try {
      // 校验全部通过后，把用户名和密码发给后端注册新账号
      await registerMutation.mutateAsync({ username, password })
      onSuccess?.()
    } catch (err: any) {
      // 注册失败时，优先显示后端返回的详细错误信息，没有的话显示默认提示
      const errorMsg = err?.response?.data?.detail || '注册失败，请重试'
      setError(errorMsg)
    }
  }

  // ============ 渲染注册表单 UI ============
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
      <h1 className="text-2xl font-bold text-stone-700 text-center mb-2">创建账号</h1>
      <p className="text-stone-500 text-center mb-6 text-sm">加入 RETALK，开始你的研究对话</p>

      {/* 登录/注册 Tab 切换 */}
      <div className="flex mb-6 border-b border-clay-300">
        <button onClick={onSwitchToLogin} className="flex-1 py-3 text-stone-500 hover:text-stone-700 transition-colors">登录</button>
        <button className="flex-1 py-3 text-stone-700 font-medium border-b-2 border-terracotta-500">注册</button>
      </div>

      {/* 表单主体 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-stone-700 mb-2">用户名（至少 3 个字符）</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3-20 位字符"
            className="w-full h-10 px-4 border border-clay-400 rounded-xl focus:border-2 focus:border-terracotta-500 outline-none text-stone-700 placeholder-stone-400" />
        </div>
        <div>
          <label className="block text-sm text-stone-700 mb-2">密码（至少 6 位）</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6-20 位字符"
            className="w-full h-10 px-4 border border-clay-400 rounded-xl focus:border-2 focus:border-terracotta-500 outline-none text-stone-700 placeholder-stone-400" />
        </div>
        <div>
          <label className="block text-sm text-stone-700 mb-2">确认密码</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入密码"
            className="w-full h-10 px-4 border border-clay-400 rounded-xl focus:border-2 focus:border-terracotta-500 outline-none text-stone-700 placeholder-stone-400" />
        </div>

        {/* 错误提示 */}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* 提交按钮 */}
        <button type="submit" disabled={registerMutation.isPending}
          className="w-full h-11 bg-terracotta-500 text-white font-medium rounded-xl hover:bg-terracotta-600 disabled:opacity-50 transition-colors">
          {registerMutation.isPending ? '注册中...' : '注 册'}
        </button>

        {/* 底部跳转登录链接 */}
        <p className="text-center text-sm text-stone-600">
          已有账号？<button type="button" onClick={onSwitchToLogin} className="ml-1 text-terracotta-500 hover:underline">直接登录</button>
        </p>
      </form>
    </div>
  )
}

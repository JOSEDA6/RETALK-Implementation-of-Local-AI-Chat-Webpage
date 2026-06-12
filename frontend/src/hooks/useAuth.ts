/**
 * @module useAuth
 * @description 认证相关的自定义 Hook 集合，封装登录、注册、获取当前用户、注销等操作
 * @author RETALK Team
 * @date 2026-04
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import type { LoginRequest, RegisterRequest, User } from '@/types'

// ============ 登录 Hook ============

/**
 * 登录操作 Hook
 * 发送登录请求，成功后将 token 和用户信息存入 localStorage 并更新缓存
 */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await authApi.login(data)
      // 后端只返回 user_id 和 token，这里手动拼出一个完整的 user 对象
      const user = { id: response.user_id, username: data.username }
      return { ...response, user }
    },
    onSuccess: (response, variables) => {
      // 登录成功后，把令牌和用户信息存到浏览器里，下次打开页面就不用重新登录
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify({
        id: response.user_id,
        username: variables.username
      }))
      // 直接往缓存里写入用户数据，这样界面会立刻刷新，不用再等网络请求
      queryClient.setQueryData(['currentUser'], { id: response.user_id, username: variables.username })
    },
  })
}

// ============ 注册 Hook ============

/**
 * 注册操作 Hook
 * 发送注册请求，成功后保存 token 到本地
 */
export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const response = await authApi.register(data)
      const user = { id: response.user_id, username: data.username }
      return { ...response, user }
    },
    onSuccess: (response) => {
      // 注册成功后也存令牌，这样注册完可以直接进入系统，不用再登录一次
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify({
        id: response.user_id,
        username: response.user_id // Will be updated after login
      }))
    },
  })
}

// ============ 获取当前用户 Hook ============

/**
 * 获取当前登录用户信息的 Hook
 * 从 localStorage 读取，仅在存在 token 时启用查询
 */
// 检查本地有没有存登录信息，有的话就读出来给界面用，没有就返回 null
export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const userStr = localStorage.getItem('user')
      if (userStr) return JSON.parse(userStr) as User
      return null
    },
    // 只有浏览器里存了 token 才去查用户信息，没 token 说明没登录，不用查
    enabled: !!localStorage.getItem('token'),
  })
}

// ============ 注销 Hook ============

/**
 * 注销操作 Hook
 * 调用后端注销接口并清理本地存储和查询缓存
 */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // 退出登录后，把本地存的令牌和用户信息全删掉，缓存也清空，回到未登录状态
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      queryClient.clear()
    },
  })
}

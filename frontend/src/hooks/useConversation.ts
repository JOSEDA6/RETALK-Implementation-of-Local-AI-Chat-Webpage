/**
 * @module useConversation
 * @description 对话相关的自定义 Hook 集合，封装对话列表、详情、消息、创建、删除等操作
 * @author RETALK Team
 * @date 2026-04
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { conversationApi } from '@/lib/api'
import type { Conversation } from '@/types'

// ============ 对话列表 Hook ============

/**
 * 获取对话列表的 Hook
 * 仅在用户已登录时启用，缓存 60 秒
 */
// 从后端拉取所有对话列表，1 分钟内不会重复请求，减少网络消耗
export function useConversationList() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationApi.list(),
    enabled: !!localStorage.getItem('token'),
    staleTime: 60_000,
    retry: false,
  })
}

// ============ 对话详情 Hook ============

/**
 * 获取单个对话详情的 Hook
 * @param id - 对话 ID，为空时不触发请求
 */
export function useConversation(id?: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => conversationApi.get(id!),
    enabled: !!id && !!localStorage.getItem('token'),
    retry: false,
    staleTime: 60_000,
  })
}

// ============ 消息列表 Hook ============

/**
 * 获取指定对话消息列表的 Hook
 * @param conversationId - 对话 ID，为空时不触发请求
 */
// 根据对话 ID 去拉取这个对话里的所有聊天记录，缓存 2 分钟
export function useMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationApi.getMessages(conversationId!),
    enabled: !!conversationId && !!localStorage.getItem('token'),
    retry: false,
    staleTime: 120_000,
  })
}

// ============ 创建对话 Hook ============

/**
 * 创建新对话的 Hook
 * 成功后自动刷新对话列表缓存
 */
export function useCreateConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => conversationApi.create(),
    onSuccess: () => {
      // 新建对话成功后，通知数据管家重新拉取对话列表，这样侧边栏就能看到新对话了
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// ============ 删除对话 Hook ============

/** 乐观更新的上下文类型，用于回滚 */
interface DeleteContext {
  /** 删除前的对话列表快照，删除失败时用于恢复 */
  previous: Conversation[] | undefined
}

/**
 * 删除对话的 Hook
 * 使用乐观更新策略：先在界面上移除，再调用后端接口
 * 如果后端失败则自动回滚
 */
// 删除对话时用了"乐观更新"技巧——先在界面上把对话删掉让用户感觉很快，
// 然后再去后端真正删除，如果后端删除失败就自动恢复回来
export function useDeleteConversation() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string, DeleteContext>({
    mutationFn: async (id) => {
      console.log('[DeleteMutation] Calling API for:', id)
      await conversationApi.delete(id)
      console.log('[DeleteMutation] API returned success for:', id)
    },
    onMutate: async (id) => {
      // 在发请求之前，先取消正在进行的列表查询，然后从缓存里把这条对话移除
      await queryClient.cancelQueries({ queryKey: ['conversations'] })
      const previous = queryClient.getQueryData<Conversation[]>(['conversations'])
      queryClient.setQueryData(['conversations'],
        (old: Conversation[] | undefined) => old?.filter(c => c.id !== id)
      )
      // 同时清掉这个对话的消息缓存和详情缓存，因为对话都删了，这些数据也没用了
      queryClient.removeQueries({ queryKey: ['messages', id] })
      queryClient.removeQueries({ queryKey: ['conversation', id] })
      console.log('[DeleteMutation] Optimistic update done, removed:', id)
      return { previous }
    },
    onError: (err, id, ctx) => {
      // 如果后端删除失败，把之前保存的旧数据恢复回去，对话又会重新出现在列表里
      console.error('[DeleteMutation] Error:', err.message, 'id:', id)
      if (ctx?.previous) {
        queryClient.setQueryData(['conversations'], ctx.previous)
      }
    },
    onSettled: (_data, _err, id) => {
      // 不管成功还是失败，最后都重新从后端拉一次最新的对话列表，保证数据准确
      console.log('[DeleteMutation] onSettled for:', id)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// ============ 发送消息 Hook ============

/**
 * 发送消息的 Hook
 * 成功后刷新对话列表和对应对话的消息缓存
 */
export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, message }: { conversationId?: string; message: string }) =>
      conversationApi.sendMessage(conversationId, message),
    onSuccess: (data) => {
      // 发消息成功后，刷新对话列表（标题可能变了）和消息列表（新消息要显示出来）
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (data.conversation_id) {
        queryClient.invalidateQueries({ queryKey: ['messages', data.conversation_id] })
      }
    },
  })
}

// ============ 删除消息 Hook ============

/**
 * 删除单条消息的 Hook
 * 成功后刷新该对话的消息列表缓存
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      conversationApi.deleteMessage(conversationId, messageId),
    onSuccess: (_, variables) => {
      // 删除消息成功后，重新拉取这个对话的消息列表，让界面更新
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] })
    },
  })
}

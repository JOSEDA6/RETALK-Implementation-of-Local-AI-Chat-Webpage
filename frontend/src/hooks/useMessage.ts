/**
 * @module useMessage
 * @description 消息相关的自定义 Hook 集合，封装消息列表查询、发送消息和删除消息操作
 * @author RETALK Team
 * @date 2026-04
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { conversationApi } from '@/lib/api'
import type { Message } from '@/types'

// ============ 消息列表 Hook ============

/**
 * 获取指定对话的消息列表 Hook
 * @param conversationId - 对话 ID，为空时不触发请求
 */
// 根据对话 ID 去后端拉取所有聊天消息，没有对话 ID 就不请求
export function useMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationApi.getMessages(conversationId!),
    enabled: !!conversationId,
  })
}

// ============ 发送消息 Hook ============

/**
 * 发送消息的 Hook
 * 成功后刷新消息列表和对话列表缓存
 */
// 把用户的消息发送给 AI，发送成功后自动刷新聊天记录和对话列表
export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, message }: { conversationId?: string; message: string }) =>
      conversationApi.sendMessage(conversationId, message),
    onSuccess: (data) => {
      if (data.conversation_id) {
        // 消息发送成功后，通知数据管家重新拉取消息和对话列表，让新消息显示出来
        queryClient.invalidateQueries({ queryKey: ['messages', data.conversation_id] })
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
    },
  })
}

// ============ 删除消息 Hook ============

/**
 * 删除单条消息的 Hook
 * 成功后刷新对应对话的消息列表缓存
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      conversationApi.deleteMessage(conversationId, messageId),
    onSuccess: (_, variables) => {
      // 消息删除后，重新拉取这个对话的消息列表，这样被删的消息就从界面上消失了
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] })
    },
  })
}

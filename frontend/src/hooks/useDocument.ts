/**
 * @module useDocument
 * @description 文档相关的自定义 Hook 集合，封装文档列表查询、上传和删除操作
 * @author RETALK Team
 * @date 2026-04
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { documentApi } from '@/lib/api'

// ============ 文档列表 Hook ============

/**
 * 获取文档列表的 Hook
 * 仅在用户已登录时启用查询
 */
// 从后端拉取用户上传的所有文档列表，没登录就不请求
export function useDocumentList() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentApi.list(),
    enabled: !!localStorage.getItem('token'),
  })
}

// ============ 上传文档 Hook ============

/**
 * 上传文档的 Hook
 * 上传成功后自动刷新文档列表
 */
// 上传文件到后端，上传成功后自动重新拉取文档列表，这样新文件就能在界面上看到
export function useUploadDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) =>
      documentApi.upload(file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

// ============ 删除文档 Hook ============

/**
 * 删除文档的 Hook
 * 删除成功后自动刷新文档列表
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => documentApi.delete(id),
    onSuccess: () => {
      // 删除成功后重新拉取文档列表，这样被删除的文件就从界面上消失了
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

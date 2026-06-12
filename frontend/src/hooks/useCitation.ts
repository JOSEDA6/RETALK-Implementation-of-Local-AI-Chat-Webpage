/**
 * @module useCitation
 * @description 引用相关的自定义 Hook，提供引用详情查询和引用导出功能
 * @author RETALK Team
 * @date 2026-04
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { citationApi } from '@/lib/api'

// ============ 引用详情 Hook ============

/**
 * 获取单条引用详情的 Hook
 * @param citationId - 引用 ID，为空时不触发请求
 */
// 根据引用 ID 去后端拿这条引用的详细内容，ID 为空就不请求
export function useCitation(citationId?: string) {
  return useQuery({
    queryKey: ['citation', citationId],
    queryFn: () => citationApi.get(citationId!),
    // 只有传了引用 ID 才发请求，没传就不发
    enabled: !!citationId,
  })
}

// ============ 引用导出 Hook ============

/**
 * 导出引用的 Hook
 * 支持 BibTeX 和 GB/T 7714 两种学术引用格式
 */
// 把某条消息的引用导出成学术论文能用的格式（BibTeX 或国标格式）
export function useExportCitation() {
  return useMutation({
    mutationFn: ({ messageId, format }: { messageId: string; format: 'bibtex' | 'gbt7714' }) =>
      citationApi.export(messageId, format),
  })
}

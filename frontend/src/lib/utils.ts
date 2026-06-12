/**
 * @module Utils
 * @description 通用工具函数集合，包含日期格式化、文件大小转换、字符串处理、表单校验等
 * @author RETALK Team
 * @date 2026-04
 */

import { format, formatDistanceToNow, isToday, isYesterday, isWithinInterval } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Conversation, ConversationGroup } from '@/types'

// ============ 日期与时间工具 ============

/**
 * 将 ISO 时间字符串格式化为 HH:mm 格式
 * 例如 "2026-04-24T14:30:00Z" => "14:30"
 */
export function formatTime(isoString: string): string {
  return format(new Date(isoString), 'HH:mm')
}

/**
 * 将 ISO 时间字符串转换为相对日期描述
 * 例如 "今天"、"昨天"、"3 天前"、"2026-04-01"
 */
// 把时间戳变成人话，比如"今天"、"昨天"、"3 天前"，超过 7 天就显示具体日期
export function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString)
  if (isToday(date)) return '今天'
  if (isYesterday(date)) return '昨天'
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  if (isWithinInterval(date, { start: sevenDaysAgo, end: new Date() })) {
    return formatDistanceToNow(date, { locale: zhCN, addSuffix: true })
  }
  return format(date, 'yyyy-MM-dd', { locale: zhCN })
}

// ============ 文件与字符串工具 ============

/**
 * 将字节数转换为人类可读的文件大小
 * 例如 1536 => "1.5 KB"
 */
// 把文件大小从字节数变成人能看懂的格式，比如 1024 字节变成 "1.0 KB"
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let size = bytes
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * 截断文本，超过最大长度时末尾加省略号
 */
export function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : text.slice(0, maxLength) + '...'
}

/**
 * 生成 UUID v4 格式的随机标识符
 */
// 生成一个全球唯一的随机 ID，格式类似 "a1b2c3d4-e5f6-4xxx-yxxx-xxxxxxxxxxxx"
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return c === 'x' ? r.toString(16) : ((r & 0x3) | 0x8).toString(16)
  })
}

// ============ 表单校验工具 ============

/**
 * 校验用户名是否合法
 * 规则：3-20 位，仅允许字母、数字、下划线
 */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username)
}

/**
 * 校验密码是否合法
 * 规则：6-20 位，仅允许可打印 ASCII 字符
 */
export function isValidPassword(password: string): boolean {
  return /^[\x20-\x7E]{6,20}$/.test(password)
}

// ============ 对话分组工具 ============

/**
 * 将对话列表按日期分组
 * 分为"今天"、"昨天"、"7 天前"、"更早"四组
 */
// 把所有对话按时间分成几组，方便在侧边栏里按"今天"、"昨天"等标签显示
export function groupConversationsByDate(
  conversations: Conversation[]
): ConversationGroup[] {
  const today: Conversation[] = []
  const yesterday: Conversation[] = []
  const sevenDaysAgo: Conversation[] = []
  const earlier: Conversation[] = []

  conversations.forEach((conv) => {
    const date = new Date(conv.updated_at || conv.created_at)
    if (isToday(date)) {
      today.push(conv)
    } else if (isYesterday(date)) {
      yesterday.push(conv)
    } else {
      const sevenDaysAgoDate = new Date()
      sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7)
      if (date > sevenDaysAgoDate) {
        sevenDaysAgo.push(conv)
      } else {
        earlier.push(conv)
      }
    }
  })

  // 只有非空的分组才会被加到结果里，空分组不显示
  const groups: ConversationGroup[] = []
  if (today.length > 0) groups.push({ label: '今天', conversations: today })
  if (yesterday.length > 0) groups.push({ label: '昨天', conversations: yesterday })
  if (sevenDaysAgo.length > 0) groups.push({ label: '7 天前', conversations: sevenDaysAgo })
  if (earlier.length > 0) groups.push({ label: '更早', conversations: earlier })

  return groups
}

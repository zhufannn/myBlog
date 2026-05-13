/**
 * 反馈列表：仅存本地 localStorage，无后端同步。
 */
import type { AuthRole } from './useBlogAuth'

export type FeedbackRecord = {
  id: string
  createdAt: string
  role: AuthRole
  authorLabel: string
  message: string
}

const STORAGE_KEY = 'personal-blog-feedback'

function isRecord(x: unknown): x is FeedbackRecord {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.createdAt === 'string' &&
    (o.role === 'member' || o.role === 'guest') &&
    typeof o.authorLabel === 'string' &&
    typeof o.message === 'string'
  )
}

export function loadFeedback(): FeedbackRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data.filter(isRecord)
  } catch {
    return []
  }
}

function persistAll(items: FeedbackRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export function appendFeedback(entry: {
  role: AuthRole
  authorLabel: string
  message: string
}): FeedbackRecord {
  const rec: FeedbackRecord = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    role: entry.role,
    authorLabel: entry.authorLabel,
    message: entry.message,
  }
  const next = [rec, ...loadFeedback()]
  persistAll(next)
  return rec
}

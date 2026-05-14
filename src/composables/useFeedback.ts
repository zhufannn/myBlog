/**
 * 反馈列表：生产环境由 Vercel Serverless `/api/feedback` + Vercel Postgres 提供；
 * 请求失败时回退为构建时打包的 src/data/feedback.json 快照（只读）。
 */
import type { AuthRole } from './useBlogAuth'
import feedbackSnapshot from '../data/feedback.json'

export type FeedbackRecord = {
  id: string
  createdAt: string
  role: AuthRole
  authorLabel: string
  message: string
}

const API = '/api/feedback'

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

function normalizeList(data: unknown): FeedbackRecord[] {
  if (!Array.isArray(data)) return []
  return data.filter(isRecord)
}

export async function loadFeedbackFromProject(): Promise<{
  items: FeedbackRecord[]
  /** 是否已命中可写 API（Vercel Postgres 等） */
  live: boolean
}> {
  try {
    const r = await fetch(API, { headers: { Accept: 'application/json' } })
    if (r.ok) {
      const data = (await r.json()) as unknown
      return { items: normalizeList(data), live: true }
    }
  } catch {
    /* 静态部署或接口未就绪 */
  }

  return {
    items: normalizeList(feedbackSnapshot as unknown),
    live: false,
  }
}

export async function appendFeedbackToProject(entry: {
  role: AuthRole
  authorLabel: string
  message: string
}): Promise<FeedbackRecord> {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      role: entry.role,
      authorLabel: entry.authorLabel,
      message: entry.message,
    }),
  })

  const text = await r.text()
  if (!r.ok) {
    let msg = text || '提交失败'
    try {
      const j = JSON.parse(text) as { error?: string }
      if (j.error) msg = j.error
    } catch {
      /* use raw */
    }
    throw new Error(msg)
  }

  try {
    const rec = JSON.parse(text) as unknown
    if (isRecord(rec)) return rec
  } catch {
    /* fall through */
  }
  throw new Error('服务器返回无效')
}

/**
 * 反馈 API 核心逻辑：供 Vercel Function 与 Vite 开发中间件共用。
 * Node 17 及以下无内置 fetch：Neon 依赖 fetch，此处用 undici 补齐。
 * 使用静态 import（不用动态 import）：vite 打包 config 时动态 import('undici') 往往在旧 Node 下解析失败。
 */
import { neon } from '@neondatabase/serverless'
import {
  fetch as undiciFetch,
  FormData as UndiciFormData,
  Headers as UndiciHeaders,
  Request as UndiciRequest,
  Response as UndiciResponse,
} from 'undici'

/** 富文本含 base64 插图；与前端 FeedbackPage MAX_HTML 保持一致 */
const FEEDBACK_MESSAGE_MAX_CHARS = 2_000_000

export type SqlFn = ReturnType<typeof neon>

let fetchPolyfillDone = false

export function ensureGlobalFetch(): void {
  if (typeof globalThis.fetch === 'function') return
  if (fetchPolyfillDone) return
  globalThis.fetch = undiciFetch as typeof globalThis.fetch
  globalThis.Headers = UndiciHeaders as typeof globalThis.Headers
  globalThis.Request = UndiciRequest as typeof globalThis.Request
  globalThis.Response = UndiciResponse as typeof globalThis.Response
  globalThis.FormData = UndiciFormData as typeof globalThis.FormData
  fetchPolyfillDone = true
}

type Body = {
  role?: unknown
  authorLabel?: unknown
  message?: unknown
}

export function getPostgresUrl(): string | null {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL
  return url?.trim() ? url.trim() : null
}

function parseEntry(
  body: unknown,
): { role: 'member' | 'guest'; authorLabel: string; message: string } | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Body
  if (o.role !== 'member' && o.role !== 'guest') return null
  if (typeof o.authorLabel !== 'string' || !o.authorLabel.trim()) return null
  if (typeof o.message !== 'string' || !o.message.trim()) return null
  if (o.message.length > FEEDBACK_MESSAGE_MAX_CHARS) return null
  return {
    role: o.role,
    authorLabel: o.authorLabel.trim(),
    message: o.message.trim(),
  }
}

function rowToJson(row: Record<string, unknown>) {
  const id = String(row.id)
  const createdRaw = row.created_at
  const created =
    createdRaw instanceof Date ? createdRaw.toISOString() : String(createdRaw)
  return {
    id,
    createdAt: created,
    role: String(row.role),
    authorLabel: String(row.author_label),
    message: String(row.message),
  }
}

async function ensureSchema(sql: SqlFn): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      role TEXT NOT NULL CHECK (role IN ('member', 'guest')),
      author_label TEXT NOT NULL,
      message TEXT NOT NULL CHECK (char_length(message) <= 2000000)
    )
  `
}

/** 旧库曾为 2000 字；升级为富文本后需放宽约束 */
async function migrateMessageLengthConstraint(sql: SqlFn): Promise<void> {
  try {
    await sql`ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_message_check`
  } catch {
    /* ignore */
  }
  try {
    await sql`
      ALTER TABLE feedback
        ADD CONSTRAINT feedback_message_check CHECK (char_length(message) <= 2000000)
    `
  } catch {
    /* 已存在兼容约束时忽略 */
  }
}

export async function runFeedbackApi(input: {
  method: string | undefined
  body: unknown
  postgresUrl: string | null
}): Promise<{ status: number; json: unknown }> {
  if (!input.postgresUrl) {
    return {
      status: 503,
      json: { error: '未配置 POSTGRES_URL（或 DATABASE_URL）' },
    }
  }

  ensureGlobalFetch()

  const sql = neon(input.postgresUrl)

  try {
    await ensureSchema(sql)
    await migrateMessageLengthConstraint(sql)
  } catch (e) {
    console.error('feedback ensureSchema', e)
    return { status: 500, json: { error: '数据库初始化失败，请检查连接串与网络' } }
  }

  const method = input.method?.toUpperCase() || 'GET'

  if (method === 'GET') {
    try {
      const rows = await sql`
        SELECT id, created_at, role, author_label, message
        FROM feedback
        ORDER BY created_at DESC
        LIMIT 300
      `
      return {
        status: 200,
        json: rows.map((r) => rowToJson(r as Record<string, unknown>)),
      }
    } catch (e) {
      console.error('feedback GET', e)
      return { status: 500, json: { error: '读取反馈失败' } }
    }
  }

  if (method === 'POST') {
    const parsed = parseEntry(input.body)
    if (!parsed) {
      return { status: 400, json: { error: '无效的反馈数据' } }
    }

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

    try {
      const rows = await sql`
        INSERT INTO feedback (id, role, author_label, message)
        VALUES (${id}, ${parsed.role}, ${parsed.authorLabel}, ${parsed.message})
        RETURNING id, created_at, role, author_label, message
      `
      const row = rows[0] as Record<string, unknown> | undefined
      if (!row) {
        return { status: 500, json: { error: '写入后无返回' } }
      }
      return { status: 200, json: rowToJson(row) }
    } catch (e) {
      console.error('feedback POST', e)
      return { status: 500, json: { error: '保存反馈失败' } }
    }
  }

  return { status: 405, json: { error: 'Method Not Allowed' } }
}

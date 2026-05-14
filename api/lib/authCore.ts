/**
 * 正式用户认证：blog_users 表 + bcrypt 密码哈希（供 Vite 中间件与 Vercel Function 共用）。
 */
import { compareSync, hashSync } from 'bcryptjs'
import { neon } from '@neondatabase/serverless'
import { ensureGlobalFetch } from './feedbackCore'

export type SqlAuth = ReturnType<typeof neon>

const BCRYPT_ROUNDS = 10

/** 首次建表且无用户时写入的演示账号（密码仅用于初次种子，之后以库中哈希为准） */
const SEED_USERS = [
  { id: 'zhufan', username: 'zhufan', plainPassword: 'zf195099', displayName: 'zhufan' },
  { id: 'kuangmin', username: 'kuangmin', plainPassword: 'km123', displayName: 'kuangmin' },
] as const

async function ensureUsersSchema(sql: SqlAuth): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS blog_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS blog_users_username_lower_idx ON blog_users (lower(username))
  `
}

async function seedUsersIfEmpty(sql: SqlAuth): Promise<void> {
  const rows = await sql`SELECT count(*)::int AS c FROM blog_users`
  const c = Number((rows[0] as { c?: number })?.c ?? 0)
  if (c > 0) return
  for (const u of SEED_USERS) {
    const hash = hashSync(u.plainPassword, BCRYPT_ROUNDS)
    await sql`
      INSERT INTO blog_users (id, username, password_hash, display_name)
      VALUES (${u.id}, ${u.username}, ${hash}, ${u.displayName})
    `
  }
}

function parseLoginBody(body: unknown): { username: string; password: string } | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  if (typeof o.username !== 'string' || typeof o.password !== 'string') return null
  const username = o.username.trim()
  if (!username || !o.password) return null
  return { username, password: o.password }
}

function parsePasswordBody(
  body: unknown,
): { memberId: string; oldPassword: string; newPassword: string } | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  if (typeof o.memberId !== 'string' || !o.memberId.trim()) return null
  if (typeof o.oldPassword !== 'string' || typeof o.newPassword !== 'string') return null
  return {
    memberId: o.memberId.trim(),
    oldPassword: o.oldPassword,
    newPassword: o.newPassword,
  }
}

export async function runAuthLogin(input: {
  body: unknown
  postgresUrl: string | null
}): Promise<{ status: number; json: unknown }> {
  if (!input.postgresUrl) {
    return { status: 503, json: { error: '未配置数据库' } }
  }
  const parsed = parseLoginBody(input.body)
  if (!parsed) {
    return { status: 400, json: { error: '无效的登录数据' } }
  }

  ensureGlobalFetch()
  const sql = neon(input.postgresUrl)

  try {
    await ensureUsersSchema(sql)
    await seedUsersIfEmpty(sql)
  } catch (e) {
    console.error('auth ensureUsersSchema', e)
    return { status: 500, json: { error: '用户表初始化失败' } }
  }

  try {
    const rows = await sql`
      SELECT id, password_hash, display_name
      FROM blog_users
      WHERE lower(username) = lower(${parsed.username})
      LIMIT 1
    `
    const row = rows[0] as
      | { id: string; password_hash: string; display_name: string }
      | undefined
    if (!row) {
      return { status: 401, json: { error: '账号或密码不正确' } }
    }
    const ok = compareSync(parsed.password, row.password_hash)
    if (!ok) {
      return { status: 401, json: { error: '账号或密码不正确' } }
    }
    return {
      status: 200,
      json: { memberId: row.id, displayName: row.display_name },
    }
  } catch (e) {
    console.error('auth login', e)
    return { status: 500, json: { error: '登录服务异常' } }
  }
}

export async function runAuthPasswordChange(input: {
  body: unknown
  postgresUrl: string | null
}): Promise<{ status: number; json: unknown }> {
  if (!input.postgresUrl) {
    return { status: 503, json: { error: '未配置数据库' } }
  }
  const parsed = parsePasswordBody(input.body)
  if (!parsed) {
    return { status: 400, json: { error: '无效的请求数据' } }
  }
  if (parsed.newPassword.length < 4) {
    return { status: 400, json: { error: '新密码至少 4 位' } }
  }
  if (parsed.newPassword.length > 128) {
    return { status: 400, json: { error: '新密码过长' } }
  }

  ensureGlobalFetch()
  const sql = neon(input.postgresUrl)

  try {
    await ensureUsersSchema(sql)
    await seedUsersIfEmpty(sql)
  } catch (e) {
    console.error('auth ensureUsersSchema', e)
    return { status: 500, json: { error: '用户表初始化失败' } }
  }

  try {
    const rows = await sql`
      SELECT id, password_hash FROM blog_users WHERE id = ${parsed.memberId} LIMIT 1
    `
    const row = rows[0] as { id: string; password_hash: string } | undefined
    if (!row) {
      return { status: 404, json: { error: '用户不存在' } }
    }
    const ok = compareSync(parsed.oldPassword, row.password_hash)
    if (!ok) {
      return { status: 401, json: { error: '原密码不正确' } }
    }
    const newHash = hashSync(parsed.newPassword, BCRYPT_ROUNDS)
    await sql`UPDATE blog_users SET password_hash = ${newHash} WHERE id = ${parsed.memberId}`
    return { status: 200, json: { ok: true } }
  } catch (e) {
    console.error('auth password', e)
    return { status: 500, json: { error: '修改密码失败' } }
  }
}

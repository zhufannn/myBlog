/**
 * 正式用户认证：blog_users 表 + bcrypt 密码哈希（供 Vite 中间件与 Vercel Function 共用）。
 */
import { compareSync, hashSync } from 'bcryptjs'
import { neon } from '@neondatabase/serverless'
import { ensureGlobalFetch } from './feedbackCore.js'
import {
  buildMemberSessionSetCookie,
  createMemberSessionToken,
} from './memberSession.js'

export type SqlAuth = ReturnType<typeof neon>

const BCRYPT_ROUNDS = 10

/** 首次建表且无用户时写入的演示账号（密码仅用于初次种子，之后以库中哈希为准） */
const SEED_USERS = [
  { id: 'zhufan', username: 'zhufan', plainPassword: 'zf195099', displayName: 'zhufan', isAdmin: false },
  { id: 'kuangmin', username: 'kuangmin', plainPassword: 'km123', displayName: 'kuangmin', isAdmin: false },
  {
    id: 'admin',
    username: 'admin',
    plainPassword: 'zf195099',
    displayName: '管理员',
    isAdmin: true,
  },
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
  await sql`
    ALTER TABLE blog_users
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE
  `
}

async function seedUsersIfEmpty(sql: SqlAuth): Promise<void> {
  const rows = await sql`SELECT count(*)::int AS c FROM blog_users`
  const c = Number((rows[0] as { c?: number })?.c ?? 0)
  if (c > 0) return
  for (const u of SEED_USERS) {
    const hash = hashSync(u.plainPassword, BCRYPT_ROUNDS)
    await sql`
      INSERT INTO blog_users (id, username, password_hash, display_name, is_admin)
      VALUES (${u.id}, ${u.username}, ${hash}, ${u.displayName}, ${u.isAdmin})
    `
  }
}

/** 已有历史数据但未灌入 admin 时补一行（避免仅空库才 seed） */
async function ensureAdminAccount(sql: SqlAuth): Promise<void> {
  const r = await sql`
    SELECT count(*)::int AS c FROM blog_users WHERE lower(username) = lower('admin')
  `
  const n = Number((r[0] as { c?: number })?.c ?? 0)
  if (n > 0) return
  const u = SEED_USERS.find((x) => x.id === 'admin')
  if (!u) return
  const hash = hashSync(u.plainPassword, BCRYPT_ROUNDS)
  await sql`
    INSERT INTO blog_users (id, username, password_hash, display_name, is_admin)
    VALUES (${u.id}, ${u.username}, ${hash}, ${u.displayName}, ${u.isAdmin})
  `
}

/** 供文档库等模块复用：建表 + 种子 + 补 admin（单次执行体） */
async function migrateBlogUsersCore(sql: SqlAuth): Promise<void> {
  await ensureUsersSchema(sql)
  await seedUsersIfEmpty(sql)
  await ensureAdminAccount(sql)
}

/** 进程内对已连接库只跑一次迁移（避免每笔请求多条 DDL + 远端往返） */
const blogUsersReadyByUrl = new Set<string>()
const blogUsersMigratingByUrl = new Map<string, Promise<void>>()

export async function ensureBlogUsersSchema(sql: SqlAuth, postgresUrl: string): Promise<void> {
  const key = postgresUrl.trim()
  if (!key) throw new Error('postgresUrl missing')
  if (blogUsersReadyByUrl.has(key)) return

  const queued = blogUsersMigratingByUrl.get(key)
  if (queued) return queued

  const p = (async (): Promise<void> => {
    await migrateBlogUsersCore(sql)
    blogUsersReadyByUrl.add(key)
  })()
  blogUsersMigratingByUrl.set(key, p)
  try {
    await p
  } finally {
    blogUsersMigratingByUrl.delete(key)
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
}): Promise<{ status: number; json: unknown; setCookieHeader?: string }> {
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
    await ensureBlogUsersSchema(sql, input.postgresUrl)
  } catch (e) {
    console.error('auth ensureUsersSchema', e)
    return { status: 500, json: { error: '用户表初始化失败' } }
  }

  try {
    const rows = await sql`
      SELECT id, password_hash, display_name, is_admin
      FROM blog_users
      WHERE lower(username) = lower(${parsed.username})
      LIMIT 1
    `
    const row = rows[0] as
      | { id: string; password_hash: string; display_name: string; is_admin: boolean }
      | undefined
    if (!row) {
      return { status: 401, json: { error: '账号或密码不正确' } }
    }
    const ok = compareSync(parsed.password, row.password_hash)
    if (!ok) {
      return { status: 401, json: { error: '账号或密码不正确' } }
    }
    const token = createMemberSessionToken(row.id)
    const setCookieHeader = token ? buildMemberSessionSetCookie(token) : undefined
    return {
      status: 200,
      json: {
        memberId: row.id,
        displayName: row.display_name,
        isAdmin: Boolean(row.is_admin),
      },
      ...(setCookieHeader ? { setCookieHeader } : {}),
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
    await ensureBlogUsersSchema(sql, input.postgresUrl)
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

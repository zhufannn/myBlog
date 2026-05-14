/**
 * 本地验证 Vercel Postgres 是否可连、feedback 表是否存在。
 * 用法（在仓库根目录）:
 *   npx vercel link
 *   npx vercel env pull .env.local
 *   node scripts/verify-feedback-db.mjs
 *
 * 不输出或记录完整连接串。
 */
import { existsSync, readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

function loadDotEnvLocal() {
  if (!existsSync('.env.local')) return
  const text = readFileSync('.env.local', 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let v = trimmed.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = v
  }
}

loadDotEnvLocal()

async function ensureFetch() {
  if (typeof globalThis.fetch === 'function') return
  const undici = await import('undici')
  globalThis.fetch = undici.fetch
  globalThis.Headers = undici.Headers
  globalThis.Request = undici.Request
  globalThis.Response = undici.Response
  if (!globalThis.FormData && undici.FormData) globalThis.FormData = undici.FormData
}

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL
if (!url?.trim()) {
  console.error('[失败] 未找到 POSTGRES_URL / DATABASE_URL')
  console.error('  1) npx vercel link')
  console.error('  2) npx vercel env pull .env.local')
  console.error('  3) 再执行: npm run verify:db')
  process.exit(1)
}

const masked = `${url.slice(0, 24)}…`
console.log('[信息] 使用连接串前缀:', masked)

await ensureFetch()

const sql = neon(url.trim())

try {
  const ping = await sql`SELECT 1 AS ok`
  console.log('[通过] SQL 连通:', ping)
} catch (e) {
  console.error('[失败] 无法执行 SELECT 1:', e instanceof Error ? e.message : e)
  process.exit(1)
}

try {
  const rows = await sql`
    SELECT count(*)::int AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'feedback'
  `
  const exists = rows[0]?.n === 1
  console.log('[信息] feedback 表已存在:', exists)
  if (exists) {
    const cnt = await sql`SELECT count(*)::int AS n FROM feedback`
    console.log('[信息] feedback 当前行数:', cnt[0]?.n ?? '?')
  } else {
    console.log('[信息] 表尚未创建属正常：首次请求 /api/feedback 会自动 CREATE TABLE')
  }
} catch (e) {
  console.error('[失败] 检查表信息出错:', e instanceof Error ? e.message : e)
  process.exit(1)
}

console.log('[完成] 数据库侧验证通过。若要测 HTTP /api/feedback，请运行: npm run dev:vercel')

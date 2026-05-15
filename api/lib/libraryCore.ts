/**
 * 知识库 / 单层目录 / 文档 / 评论 —— 与 Vite 中间件、Vercel Function 共用。
 */
import { compareSync } from 'bcryptjs'
import { neon } from '@neondatabase/serverless'
import { ensureBlogUsersSchema, type SqlAuth } from './authCore.js'
import { ensureGlobalFetch, getPostgresUrl } from './feedbackCore.js'
import {
  parseMemberSessionFromCookieHeader,
  verifyMemberSessionToken,
} from './memberSession.js'

export { getPostgresUrl }

const BODY_HTML_MAX = 5_000_000
const COMMENT_MSG_MAX = 2_000_000

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function slugOk(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(s) && s.length <= 128
}

/** 由标题推导 URL slug；纯中文等无法拉丁化时用时间戳占位（仍符合 slugOk） */
function slugBaseFromTitle(title: string): string {
  const raw = title.trim().toLowerCase()
  let s = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
  if (!slugOk(s)) {
    return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
  }
  return s
}

async function uniqueKbSlug(sql: SqlAuth, base: string): Promise<string> {
  let candidate = base.slice(0, 128)
  let n = 0
  while (n < 500) {
    const rows = await sql`SELECT 1 FROM blog_knowledge_bases WHERE slug = ${candidate} LIMIT 1`
    if (!(rows as unknown[]).length) return candidate
    n += 1
    candidate = `${base}-${n}`.slice(0, 128)
  }
  return `${base}-${newId()}`.slice(0, 128)
}

async function uniqueFolderSlug(sql: SqlAuth, kbId: string, base: string): Promise<string> {
  let candidate = base.slice(0, 128)
  let n = 0
  while (n < 500) {
    const rows = await sql`
      SELECT 1 FROM blog_folders
      WHERE knowledge_base_id = ${kbId} AND slug = ${candidate}
      LIMIT 1
    `
    if (!(rows as unknown[]).length) return candidate
    n += 1
    candidate = `${base}-${n}`.slice(0, 128)
  }
  return `${base}-${newId()}`.slice(0, 128)
}

async function uniqueDocumentSlug(sql: SqlAuth, base: string): Promise<string> {
  let candidate = base.slice(0, 128)
  let n = 0
  while (n < 500) {
    const rows = await sql`SELECT 1 FROM blog_documents WHERE slug = ${candidate} LIMIT 1`
    if (!(rows as unknown[]).length) return candidate
    n += 1
    candidate = `${base}-${n}`.slice(0, 128)
  }
  return `${base}-${newId()}`.slice(0, 128)
}

type Err = { status: number; json: unknown }

async function migrateLibrarySchema(sql: SqlAuth): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS blog_knowledge_bases (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS blog_folders (
      id TEXT PRIMARY KEY,
      knowledge_base_id TEXT NOT NULL REFERENCES blog_knowledge_bases(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (knowledge_base_id, slug)
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS blog_folders_kb_idx ON blog_folders (knowledge_base_id)
  `
  await sql`
    CREATE TABLE IF NOT EXISTS blog_documents (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      cover TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Notes',
      tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      body_html TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES blog_users(id),
      knowledge_base_id TEXT NOT NULL REFERENCES blog_knowledge_bases(id) ON DELETE CASCADE,
      folder_id TEXT REFERENCES blog_folders(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS blog_documents_kb_folder_idx
      ON blog_documents (knowledge_base_id, folder_id)
  `
  await sql`
    CREATE TABLE IF NOT EXISTS blog_document_comments (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES blog_documents(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      role TEXT NOT NULL CHECK (role IN ('member', 'guest')),
      author_label TEXT NOT NULL,
      message TEXT NOT NULL CHECK (char_length(message) <= 2000000)
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS blog_document_comments_doc_created_idx
      ON blog_document_comments (document_id, created_at DESC)
  `
}

const libraryReadyByUrl = new Set<string>()
const libraryMigratingByUrl = new Map<string, Promise<void>>()

async function ensureLibrarySchema(sql: SqlAuth, postgresUrl: string): Promise<void> {
  const key = postgresUrl.trim()
  if (!key) throw new Error('postgresUrl missing')
  if (libraryReadyByUrl.has(key)) return
  const queued = libraryMigratingByUrl.get(key)
  if (queued) return queued
  const p = (async (): Promise<void> => {
    await migrateLibrarySchema(sql)
    libraryReadyByUrl.add(key)
  })()
  libraryMigratingByUrl.set(key, p)
  try {
    await p
  } finally {
    libraryMigratingByUrl.delete(key)
  }
}

const ADMIN_AUTH_WRITE_ERROR =
  '写操作需要管理员：请先在同域调用 POST /api/auth/login 获取 Cookie，或在请求 JSON 中提供 username 与 password。若只是读取文档，请使用 GET /api/v1/documents/:slug（不要误用 PUT/DELETE）。'

async function verifyAdmin(
  sql: SqlAuth,
  body: unknown,
  cookieHeader: string | undefined,
): Promise<{ ok: true; userId: string } | Err> {
  const rawCookie = parseMemberSessionFromCookieHeader(cookieHeader)
  if (rawCookie) {
    const pl = verifyMemberSessionToken(rawCookie)
    if (pl) {
      const rows = await sql`
        SELECT id, is_admin FROM blog_users WHERE id = ${pl.uid} LIMIT 1
      `
      const row = rows[0] as { id: string; is_admin: boolean } | undefined
      if (!row) {
        return { status: 401, json: { error: '会话已失效，请重新登录' } }
      }
      if (!row.is_admin) {
        return { status: 403, json: { error: '需要管理员权限' } }
      }
      return { ok: true, userId: row.id }
    }
  }

  if (!body || typeof body !== 'object') {
    return {
      status: 401,
      json: { error: ADMIN_AUTH_WRITE_ERROR },
    }
  }
  const o = body as Record<string, unknown>
  if (typeof o.username !== 'string' || typeof o.password !== 'string') {
    return {
      status: 401,
      json: { error: ADMIN_AUTH_WRITE_ERROR },
    }
  }
  const username = o.username.trim()
  if (!username) {
    return { status: 400, json: { error: '账号无效' } }
  }
  const rows = await sql`
    SELECT id, password_hash, is_admin
    FROM blog_users
    WHERE lower(username) = lower(${username})
    LIMIT 1
  `
  const row = rows[0] as
    | { id: string; password_hash: string; is_admin: boolean }
    | undefined
  if (!row) {
    return { status: 401, json: { error: '账号或密码不正确' } }
  }
  if (!compareSync(o.password, row.password_hash)) {
    return { status: 401, json: { error: '账号或密码不正确' } }
  }
  if (!row.is_admin) {
    return { status: 403, json: { error: '需要管理员权限' } }
  }
  return { ok: true, userId: row.id }
}

function parseTags(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean).slice(0, 32)
}

function parseComment(body: unknown): { role: 'member' | 'guest'; authorLabel: string; message: string } | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  if (o.role !== 'member' && o.role !== 'guest') return null
  if (typeof o.authorLabel !== 'string' || !o.authorLabel.trim()) return null
  if (typeof o.message !== 'string' || !o.message.trim()) return null
  if (o.message.length > COMMENT_MSG_MAX) return null
  return { role: o.role, authorLabel: o.authorLabel.trim(), message: o.message.trim() }
}

function rowComment(r: Record<string, unknown>) {
  const createdRaw = r.created_at
  const created =
    createdRaw instanceof Date ? createdRaw.toISOString() : String(createdRaw)
  return {
    id: String(r.id),
    createdAt: created,
    role: String(r.role),
    authorLabel: String(r.author_label),
    message: String(r.message),
  }
}

export async function runLibraryApi(input: {
  method: string | undefined
  pathname: string
  search: string
  body: unknown
  postgresUrl: string | null
  cookieHeader?: string | undefined
}): Promise<{ status: number; json: unknown }> {
  if (!input.postgresUrl) {
    return { status: 503, json: { error: '未配置 POSTGRES_URL（或 DATABASE_URL）' } }
  }

  ensureGlobalFetch()
  const sql = neon(input.postgresUrl)
  const method = (input.method ?? 'GET').toUpperCase()
  const sp = new URLSearchParams(input.search.startsWith('?') ? input.search.slice(1) : input.search)

  try {
    await ensureBlogUsersSchema(sql, input.postgresUrl)
    await ensureLibrarySchema(sql, input.postgresUrl)
  } catch (e) {
    console.error('library ensureSchema', e)
    return { status: 500, json: { error: '知识库初始化失败' } }
  }

  const path = input.pathname.replace(/\/{2,}/g, '/')
  const parts = path.split('/').filter(Boolean)
  // 期望 /api/v1/... → 去掉 api, v1
  let seg = parts
  const apiIdx = seg.indexOf('api')
  if (apiIdx >= 0) seg = seg.slice(apiIdx + 1)
  if (seg[0] === 'v1') seg = seg.slice(1)

  /** ——— 公开 GET ——— */
  if (method === 'GET' && seg[0] === 'knowledge-bases' && seg.length === 1) {
    try {
      const rows = await sql`
        SELECT id, slug, title, description, sort_order, created_at, updated_at
        FROM blog_knowledge_bases
        ORDER BY sort_order ASC, title ASC
      `
      return { status: 200, json: rows }
    } catch (e) {
      console.error('list kb', e)
      return { status: 500, json: { error: '读取知识库失败' } }
    }
  }

  if (method === 'GET' && seg[0] === 'tree' && seg.length === 1) {
    try {
      const kbRows = await sql`
        SELECT id, slug, title, description, sort_order, created_at, updated_at
        FROM blog_knowledge_bases
        ORDER BY sort_order ASC, title ASC
      `
      const folderRows = await sql`
        SELECT id, knowledge_base_id, slug, title, sort_order
        FROM blog_folders
        ORDER BY sort_order ASC, title ASC
      `
      const docRows = await sql`
        SELECT d.id, d.slug, d.title, d.excerpt, d.category, d.tags, d.cover, d.updated_at,
               d.knowledge_base_id, d.folder_id,
               u.display_name AS author_display_name
        FROM blog_documents d
        JOIN blog_users u ON u.id = d.author_id
        ORDER BY d.updated_at DESC
      `
      type F = {
        id: string
        knowledge_base_id: string
        slug: string
        title: string
        sort_order: number
      }
      type D = Record<string, unknown>
      const folders = folderRows as F[]
      const docs = docRows as D[]

      const tree = (kbRows as Record<string, unknown>[]).map((kb) => {
        const kid = String(kb.id)
        const kbFolders = folders.filter((f) => f.knowledge_base_id === kid)
        const folderBlocks = kbFolders.map((f) => ({
          id: f.id,
          slug: f.slug,
          title: f.title,
          sortOrder: f.sort_order,
          documents: docs
            .filter((d) => String(d.folder_id) === f.id)
            .map(mapDoc),
        }))
        const rootDocuments = docs
          .filter((d) => String(d.knowledge_base_id) === kid && (d.folder_id == null || d.folder_id === ''))
          .map(mapDoc)
        return {
          id: kb.id,
          slug: kb.slug,
          title: kb.title,
          description: kb.description,
          sortOrder: kb.sort_order,
          created_at: kb.created_at,
          updated_at: kb.updated_at,
          folders: folderBlocks,
          rootDocuments,
        }
      })
      function mapDoc(d: D) {
        return {
          id: String(d.id),
          slug: String(d.slug),
          title: String(d.title),
          excerpt: String(d.excerpt ?? ''),
          category: String(d.category ?? ''),
          tags: d.tags,
          cover: String(d.cover ?? ''),
          updated_at:
            d.updated_at instanceof Date ? d.updated_at.toISOString() : String(d.updated_at),
          author_display_name: String(d.author_display_name ?? ''),
        }
      }
      return { status: 200, json: tree }
    } catch (e) {
      console.error('tree', e)
      return { status: 500, json: { error: '读取目录树失败' } }
    }
  }

  if (method === 'GET' && seg[0] === 'tags' && seg.length === 1) {
    try {
      const rows = await sql`
        SELECT DISTINCT trim(both FROM t) AS tag
        FROM blog_documents, unnest(tags) AS t
        WHERE cardinality(tags) > 0 AND trim(both FROM t) <> ''
        ORDER BY tag
      `
      const tags = (rows as { tag: string }[])
        .map((r) => String(r.tag ?? '').trim())
        .filter(Boolean)
      return { status: 200, json: { tags } }
    } catch (e) {
      console.error('tags', e)
      return { status: 500, json: { error: '读取标签失败' } }
    }
  }

  if (method === 'GET' && seg[0] === 'home-feed' && seg.length === 1) {
    try {
      const rows = await sql`
        SELECT d.slug, d.title, d.excerpt, d.category, d.tags, d.cover, d.updated_at,
               kb.slug AS knowledge_base_slug, kb.title AS knowledge_base_title
        FROM blog_documents d
        JOIN blog_knowledge_bases kb ON kb.id = d.knowledge_base_id
        ORDER BY d.updated_at DESC
        LIMIT 500
      `
      return { status: 200, json: rows }
    } catch (e) {
      console.error('home-feed', e)
      return { status: 500, json: { error: '读取文章列表失败' } }
    }
  }

  if (method === 'GET' && seg[0] === 'knowledge-bases' && seg[2] === 'outline' && seg.length === 3) {
    const kbSlug = seg[1]
    if (!slugOk(kbSlug)) {
      return { status: 400, json: { error: '知识库 slug 无效' } }
    }
    try {
      const kbRows = await sql`
        SELECT id, slug, title, description, sort_order, created_at, updated_at
        FROM blog_knowledge_bases
        WHERE slug = ${kbSlug}
        LIMIT 1
      `
      const kb = kbRows[0] as Record<string, unknown> | undefined
      if (!kb) {
        return { status: 404, json: { error: '知识库不存在' } }
      }
      const kbId = String(kb.id)

      const rootDocs = await sql`
        SELECT d.id, d.slug, d.title, d.excerpt, d.category, d.tags, d.cover, d.updated_at,
               u.display_name AS author_display_name
        FROM blog_documents d
        JOIN blog_users u ON u.id = d.author_id
        WHERE d.knowledge_base_id = ${kbId} AND d.folder_id IS NULL
        ORDER BY d.updated_at DESC
      `

      const folderRows = await sql`
        SELECT id, slug, title, sort_order
        FROM blog_folders
        WHERE knowledge_base_id = ${kbId}
        ORDER BY sort_order ASC, title ASC
      `

      const folders: unknown[] = []
      for (const fr of folderRows as Record<string, unknown>[]) {
        const fid = String(fr.id)
        const docs = await sql`
          SELECT d.id, d.slug, d.title, d.excerpt, d.category, d.tags, d.cover, d.updated_at,
                 u.display_name AS author_display_name
          FROM blog_documents d
          JOIN blog_users u ON u.id = d.author_id
          WHERE d.folder_id = ${fid}
          ORDER BY d.updated_at DESC
        `
        folders.push({
          folder: {
            id: fr.id,
            slug: fr.slug,
            title: fr.title,
            sortOrder: fr.sort_order,
          },
          documents: docs,
        })
      }

      return {
        status: 200,
        json: {
          knowledgeBase: kb,
          rootDocuments: rootDocs,
          folders,
        },
      }
    } catch (e) {
      console.error('outline', e)
      return { status: 500, json: { error: '读取目录失败' } }
    }
  }

  if (method === 'GET' && seg[0] === 'documents' && seg.length === 2) {
    const docSlug = seg[1]
    if (!docSlug) {
      return { status: 400, json: { error: '无效文档' } }
    }
    try {
      const rows = await sql`
        SELECT d.id, d.slug, d.title, d.excerpt, d.cover, d.category, d.tags, d.body_html,
               d.created_at, d.updated_at, d.author_id,
               kb.slug AS knowledge_base_slug, kb.title AS knowledge_base_title,
               f.slug AS folder_slug, f.title AS folder_title,
               u.display_name AS author_display_name
        FROM blog_documents d
        JOIN blog_knowledge_bases kb ON kb.id = d.knowledge_base_id
        LEFT JOIN blog_folders f ON f.id = d.folder_id
        JOIN blog_users u ON u.id = d.author_id
        WHERE d.slug = ${docSlug}
        LIMIT 1
      `
      const r = rows[0] as Record<string, unknown> | undefined
      if (!r) {
        return { status: 404, json: { error: '文档不存在' } }
      }
      return { status: 200, json: r }
    } catch (e) {
      console.error('get doc', e)
      return { status: 500, json: { error: '读取文档失败' } }
    }
  }

  if (method === 'GET' && seg[0] === 'documents' && seg[2] === 'comments' && seg.length === 3) {
    const docSlug = seg[1]
    const page = Math.max(1, Math.min(500, Number.parseInt(sp.get('page') ?? '1', 10) || 1))
    const pageSize = Math.max(1, Math.min(100, Number.parseInt(sp.get('pageSize') ?? '20', 10) || 20))
    const offset = (page - 1) * pageSize

    try {
      const docRows = await sql`
        SELECT id FROM blog_documents WHERE slug = ${docSlug} LIMIT 1
      `
      const d0 = docRows[0] as { id: string } | undefined
      if (!d0) {
        return { status: 404, json: { error: '文档不存在' } }
      }
      const did = d0.id

      const countRows = await sql`
        SELECT count(*)::int AS c FROM blog_document_comments WHERE document_id = ${did}
      `
      const total = Number((countRows[0] as { c?: number })?.c ?? 0)

      const rows = await sql`
        SELECT id, created_at, role, author_label, message
        FROM blog_document_comments
        WHERE document_id = ${did}
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `
      return {
        status: 200,
        json: {
          page,
          pageSize,
          total,
          items: rows.map((x) => rowComment(x as Record<string, unknown>)),
        },
      }
    } catch (e) {
      console.error('list comments', e)
      return { status: 500, json: { error: '读取评论失败' } }
    }
  }

  /** POST 评论 */
  if (method === 'POST' && seg[0] === 'documents' && seg[2] === 'comments' && seg.length === 3) {
    const docSlug = seg[1]
    const parsed = parseComment(input.body)
    if (!parsed) {
      return { status: 400, json: { error: '无效评论数据' } }
    }
    try {
      const docRows = await sql`
        SELECT id FROM blog_documents WHERE slug = ${docSlug} LIMIT 1
      `
      const d0 = docRows[0] as { id: string } | undefined
      if (!d0) {
        return { status: 404, json: { error: '文档不存在' } }
      }
      const id = newId()
      const ins = await sql`
        INSERT INTO blog_document_comments (id, document_id, role, author_label, message)
        VALUES (${id}, ${d0.id}, ${parsed.role}, ${parsed.authorLabel}, ${parsed.message})
        RETURNING id, created_at, role, author_label, message
      `
      const row = ins[0] as Record<string, unknown> | undefined
      if (!row) {
        return { status: 500, json: { error: '写入失败' } }
      }
      return { status: 200, json: rowComment(row) }
    } catch (e) {
      console.error('post comment', e)
      return { status: 500, json: { error: '保存评论失败' } }
    }
  }

  /** 管理员：知识库 */
  if (method === 'POST' && seg[0] === 'knowledge-bases' && seg.length === 1) {
    const admin = await verifyAdmin(sql, input.body, input.cookieHeader)
    if (!('ok' in admin) || !admin.ok) {
      return admin as Err
    }
    const o = input.body as Record<string, unknown>
    let slug = typeof o.slug === 'string' ? o.slug.trim() : ''
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    const description = typeof o.description === 'string' ? o.description : ''
    const sortOrder = Number.isFinite(Number(o.sortOrder)) ? Number(o.sortOrder) : 0
    if (!title) {
      return { status: 400, json: { error: 'title 无效' } }
    }
    if (!slug) {
      slug = await uniqueKbSlug(sql, slugBaseFromTitle(title))
    } else if (!slugOk(slug)) {
      return { status: 400, json: { error: 'slug 或 title 无效' } }
    }
    const id = newId()
    try {
      await sql`
        INSERT INTO blog_knowledge_bases (id, slug, title, description, sort_order)
        VALUES (${id}, ${slug}, ${title}, ${description}, ${sortOrder})
      `
      const rows = await sql`
        SELECT id, slug, title, description, sort_order, created_at, updated_at
        FROM blog_knowledge_bases WHERE id = ${id} LIMIT 1
      `
      return { status: 200, json: (rows as Record<string, unknown>[])[0] }
    } catch (e) {
      console.error('create kb', e)
      return { status: 500, json: { error: '创建知识库失败（slug 可能重复）' } }
    }
  }

  if ((method === 'PUT' || method === 'DELETE') && seg[0] === 'knowledge-bases' && seg.length === 2) {
    const admin = await verifyAdmin(sql, input.body, input.cookieHeader)
    if (!('ok' in admin) || !admin.ok) {
      return admin as Err
    }
    const kbSlug = seg[1]
    const kbRows = await sql`
      SELECT id FROM blog_knowledge_bases WHERE slug = ${kbSlug} LIMIT 1
    `
    const kb = kbRows[0] as { id: string } | undefined
    if (!kb) {
      return { status: 404, json: { error: '知识库不存在' } }
    }

    if (method === 'DELETE') {
      try {
        await sql`DELETE FROM blog_knowledge_bases WHERE id = ${kb.id}`
        return { status: 200, json: { ok: true } }
      } catch (e) {
        console.error('delete kb', e)
        return { status: 500, json: { error: '删除失败' } }
      }
    }

    const o = input.body as Record<string, unknown>
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    const description = typeof o.description === 'string' ? o.description : ''
    const sortOrder = Number.isFinite(Number(o.sortOrder)) ? Number(o.sortOrder) : 0
    if (!title) {
      return { status: 400, json: { error: 'title 无效' } }
    }
    try {
      await sql`
        UPDATE blog_knowledge_bases
        SET title = ${title}, description = ${description}, sort_order = ${sortOrder}, updated_at = NOW()
        WHERE id = ${kb.id}
      `
      const rows = await sql`
        SELECT id, slug, title, description, sort_order, created_at, updated_at
        FROM blog_knowledge_bases WHERE id = ${kb.id} LIMIT 1
      `
      return { status: 200, json: (rows as Record<string, unknown>[])[0] }
    } catch (e) {
      console.error('update kb', e)
      return { status: 500, json: { error: '更新失败' } }
    }
  }

  /** 管理员：目录 */
  if (method === 'POST' && seg[0] === 'knowledge-bases' && seg[2] === 'folders' && seg.length === 3) {
    const admin = await verifyAdmin(sql, input.body, input.cookieHeader)
    if (!('ok' in admin) || !admin.ok) {
      return admin as Err
    }
    const kbSlug = seg[1]
    const kbRows = await sql`SELECT id FROM blog_knowledge_bases WHERE slug = ${kbSlug} LIMIT 1`
    const kb = kbRows[0] as { id: string } | undefined
    if (!kb) {
      return { status: 404, json: { error: '知识库不存在' } }
    }
    const o = input.body as Record<string, unknown>
    let fslug = typeof o.slug === 'string' ? o.slug.trim() : ''
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    const sortOrder = Number.isFinite(Number(o.sortOrder)) ? Number(o.sortOrder) : 0
    if (!title) {
      return { status: 400, json: { error: '目录 title 无效' } }
    }
    if (!fslug) {
      fslug = await uniqueFolderSlug(sql, kb.id, slugBaseFromTitle(title))
    } else if (!slugOk(fslug)) {
      return { status: 400, json: { error: '目录 slug 或 title 无效' } }
    }
    const id = newId()
    try {
      await sql`
        INSERT INTO blog_folders (id, knowledge_base_id, slug, title, sort_order)
        VALUES (${id}, ${kb.id}, ${fslug}, ${title}, ${sortOrder})
      `
      const rows = await sql`
        SELECT id, knowledge_base_id, slug, title, sort_order, created_at, updated_at
        FROM blog_folders WHERE id = ${id} LIMIT 1
      `
      return { status: 200, json: (rows as Record<string, unknown>[])[0] }
    } catch (e) {
      console.error('create folder', e)
      return { status: 500, json: { error: '创建目录失败（slug 可能重复）' } }
    }
  }

  if ((method === 'PUT' || method === 'DELETE') && seg[0] === 'knowledge-bases' && seg[2] === 'folders' && seg.length === 4) {
    const admin = await verifyAdmin(sql, input.body, input.cookieHeader)
    if (!('ok' in admin) || !admin.ok) {
      return admin as Err
    }
    const kbSlug = seg[1]
    const folderSlug = seg[3]
    const kbRows = await sql`SELECT id FROM blog_knowledge_bases WHERE slug = ${kbSlug} LIMIT 1`
    const kb = kbRows[0] as { id: string } | undefined
    if (!kb) {
      return { status: 404, json: { error: '知识库不存在' } }
    }
    const fRows = await sql`
      SELECT id FROM blog_folders
      WHERE knowledge_base_id = ${kb.id} AND slug = ${folderSlug}
      LIMIT 1
    `
    const fd = fRows[0] as { id: string } | undefined
    if (!fd) {
      return { status: 404, json: { error: '目录不存在' } }
    }

    if (method === 'DELETE') {
      try {
        await sql`DELETE FROM blog_folders WHERE id = ${fd.id}`
        return { status: 200, json: { ok: true } }
      } catch (e) {
        console.error('delete folder', e)
        return { status: 500, json: { error: '删除失败' } }
      }
    }

    const o = input.body as Record<string, unknown>
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    const sortOrder = Number.isFinite(Number(o.sortOrder)) ? Number(o.sortOrder) : 0
    if (!title) {
      return { status: 400, json: { error: 'title 无效' } }
    }
    try {
      await sql`
        UPDATE blog_folders
        SET title = ${title}, sort_order = ${sortOrder}, updated_at = NOW()
        WHERE id = ${fd.id}
      `
      const rows = await sql`
        SELECT id, knowledge_base_id, slug, title, sort_order, created_at, updated_at
        FROM blog_folders WHERE id = ${fd.id} LIMIT 1
      `
      return { status: 200, json: (rows as Record<string, unknown>[])[0] }
    } catch (e) {
      console.error('update folder', e)
      return { status: 500, json: { error: '更新失败' } }
    }
  }

  /** 管理员：文档 */
  if (method === 'POST' && seg[0] === 'documents' && seg.length === 1) {
    const admin = await verifyAdmin(sql, input.body, input.cookieHeader)
    if (!('ok' in admin) || !admin.ok) {
      return admin as Err
    }
    const o = input.body as Record<string, unknown>
    let slug = typeof o.slug === 'string' ? o.slug.trim() : ''
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    const bodyHtml = typeof o.bodyHtml === 'string' ? o.bodyHtml : ''
    const kbSlug = typeof o.knowledgeBaseSlug === 'string' ? o.knowledgeBaseSlug.trim() : ''
    const folderSlug = typeof o.folderSlug === 'string' ? o.folderSlug.trim() : ''
    const excerpt = typeof o.excerpt === 'string' ? o.excerpt : ''
    const cover = typeof o.cover === 'string' ? o.cover : ''
    const category = typeof o.category === 'string' && o.category.trim() ? o.category.trim() : 'Notes'
    const tags = parseTags(o.tags)

    if (!title || !bodyHtml) {
      return { status: 400, json: { error: 'title、bodyHtml 无效' } }
    }
    if (!slug) {
      slug = await uniqueDocumentSlug(sql, slugBaseFromTitle(title))
    } else if (!slugOk(slug)) {
      return { status: 400, json: { error: 'slug 无效' } }
    }
    if (bodyHtml.length > BODY_HTML_MAX) {
      return { status: 400, json: { error: '正文过长' } }
    }
    if (!slugOk(kbSlug)) {
      return { status: 400, json: { error: 'knowledgeBaseSlug 无效' } }
    }
    if (folderSlug && !slugOk(folderSlug)) {
      return { status: 400, json: { error: 'folderSlug 无效' } }
    }

    const kbRows = await sql`SELECT id FROM blog_knowledge_bases WHERE slug = ${kbSlug} LIMIT 1`
    const kb = kbRows[0] as { id: string } | undefined
    if (!kb) {
      return { status: 400, json: { error: '知识库不存在' } }
    }

    let folderId: string | null = null
    if (folderSlug) {
      const fRows = await sql`
        SELECT id FROM blog_folders
        WHERE knowledge_base_id = ${kb.id} AND slug = ${folderSlug}
        LIMIT 1
      `
      const fd = fRows[0] as { id: string } | undefined
      if (!fd) {
        return { status: 400, json: { error: '目录不存在' } }
      }
      folderId = fd.id
    }

    const id = newId()
    const authorId = admin.userId
    try {
      await sql`
        INSERT INTO blog_documents (
          id, slug, title, excerpt, cover, category, tags, body_html,
          author_id, knowledge_base_id, folder_id
        )
        VALUES (
          ${id}, ${slug}, ${title}, ${excerpt}, ${cover}, ${category},
          ${tags}, ${bodyHtml}, ${authorId}, ${kb.id}, ${folderId}
        )
      `
      const rows = await sql`
        SELECT d.id, d.slug, d.title, d.excerpt, d.cover, d.category, d.tags, d.body_html,
               d.created_at, d.updated_at, d.author_id,
               kb.slug AS knowledge_base_slug, kb.title AS knowledge_base_title,
               f.slug AS folder_slug, f.title AS folder_title,
               u.display_name AS author_display_name
        FROM blog_documents d
        JOIN blog_knowledge_bases kb ON kb.id = d.knowledge_base_id
        LEFT JOIN blog_folders f ON f.id = d.folder_id
        JOIN blog_users u ON u.id = d.author_id
        WHERE d.id = ${id}
        LIMIT 1
      `
      return { status: 200, json: (rows as Record<string, unknown>[])[0] }
    } catch (e) {
      console.error('create doc', e)
      return { status: 500, json: { error: '创建文档失败（slug 可能重复）' } }
    }
  }

  if ((method === 'PUT' || method === 'DELETE') && seg[0] === 'documents' && seg.length === 2) {
    const admin = await verifyAdmin(sql, input.body, input.cookieHeader)
    if (!('ok' in admin) || !admin.ok) {
      return admin as Err
    }
    const docSlug = seg[1]
    const docRows = await sql`SELECT id FROM blog_documents WHERE slug = ${docSlug} LIMIT 1`
    const d = docRows[0] as { id: string } | undefined
    if (!d) {
      return { status: 404, json: { error: '文档不存在' } }
    }

    if (method === 'DELETE') {
      try {
        await sql`DELETE FROM blog_documents WHERE id = ${d.id}`
        return { status: 200, json: { ok: true } }
      } catch (e) {
        console.error('delete doc', e)
        return { status: 500, json: { error: '删除失败' } }
      }
    }

    const o = input.body as Record<string, unknown>
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    const bodyHtml = typeof o.bodyHtml === 'string' ? o.bodyHtml : ''
    const kbSlug = typeof o.knowledgeBaseSlug === 'string' ? o.knowledgeBaseSlug.trim() : ''
    const folderSlug = typeof o.folderSlug === 'string' ? o.folderSlug.trim() : ''
    const excerpt = typeof o.excerpt === 'string' ? o.excerpt : ''
    const cover = typeof o.cover === 'string' ? o.cover : ''
    const category = typeof o.category === 'string' && o.category.trim() ? o.category.trim() : 'Notes'
    const tags = parseTags(o.tags)
    if (!title || !bodyHtml) {
      return { status: 400, json: { error: 'title 或 bodyHtml 无效' } }
    }
    if (bodyHtml.length > BODY_HTML_MAX) {
      return { status: 400, json: { error: '正文过长' } }
    }
    if (!slugOk(kbSlug)) {
      return { status: 400, json: { error: 'knowledgeBaseSlug 无效' } }
    }
    if (folderSlug && !slugOk(folderSlug)) {
      return { status: 400, json: { error: 'folderSlug 无效' } }
    }

    const kbRows = await sql`SELECT id FROM blog_knowledge_bases WHERE slug = ${kbSlug} LIMIT 1`
    const kb = kbRows[0] as { id: string } | undefined
    if (!kb) {
      return { status: 400, json: { error: '知识库不存在' } }
    }

    let folderId: string | null = null
    if (folderSlug) {
      const fRows = await sql`
        SELECT id FROM blog_folders
        WHERE knowledge_base_id = ${kb.id} AND slug = ${folderSlug}
        LIMIT 1
      `
      const fd = fRows[0] as { id: string } | undefined
      if (!fd) {
        return { status: 400, json: { error: '目录不存在' } }
      }
      folderId = fd.id
    }

    try {
      await sql`
        UPDATE blog_documents
        SET title = ${title},
            excerpt = ${excerpt},
            cover = ${cover},
            category = ${category},
            tags = ${tags},
            body_html = ${bodyHtml},
            knowledge_base_id = ${kb.id},
            folder_id = ${folderId},
            updated_at = NOW()
        WHERE id = ${d.id}
      `
      const rows = await sql`
        SELECT d.id, d.slug, d.title, d.excerpt, d.cover, d.category, d.tags, d.body_html,
               d.created_at, d.updated_at, d.author_id,
               kb.slug AS knowledge_base_slug, kb.title AS knowledge_base_title,
               f.slug AS folder_slug, f.title AS folder_title,
               u.display_name AS author_display_name
        FROM blog_documents d
        JOIN blog_knowledge_bases kb ON kb.id = d.knowledge_base_id
        LEFT JOIN blog_folders f ON f.id = d.folder_id
        JOIN blog_users u ON u.id = d.author_id
        WHERE d.id = ${d.id}
        LIMIT 1
      `
      return { status: 200, json: (rows as Record<string, unknown>[])[0] }
    } catch (e) {
      console.error('update doc', e)
      return { status: 500, json: { error: '更新失败' } }
    }
  }

  return { status: 404, json: { error: 'Not Found' } }
}

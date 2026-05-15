/**
 * 捕获 /api/v1/* ：知识库、文档、评论 API。
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPostgresUrl, runLibraryApi } from '../lib/libraryCore.js'
import { readJsonBody } from '../lib/readJsonBody.js'

function cookieHeaderFromRequest(req: VercelRequest): string | undefined {
  const c = req.headers.cookie
  if (typeof c === 'string') return c
  if (Array.isArray(c)) return c.join('; ')
  return undefined
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const rawUrl = typeof req.url === 'string' ? req.url : '/'
    const base = `http://${req.headers.host ?? 'local'}`
    const url = new URL(rawUrl, base)
    const out = await runLibraryApi({
      method: req.method,
      pathname: url.pathname,
      search: url.search,
      body: readJsonBody(req.body),
      postgresUrl: getPostgresUrl(),
      cookieHeader: cookieHeaderFromRequest(req),
    })
    res.status(out.status).json(out.json)
  } catch (e) {
    console.error('[api/v1]', e)
    res.status(500).json({ error: '接口执行失败' })
  }
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

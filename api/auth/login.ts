/**
 * POST /api/auth/login — 校验 blog_users，返回 memberId / displayName
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runAuthLogin } from '../../server/authCore'
import { getPostgresUrl } from '../../server/feedbackCore'
import { readJsonBody } from '../../server/readJsonBody'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }
    const out = await runAuthLogin({
      body: readJsonBody(req.body),
      postgresUrl: getPostgresUrl(),
    })
    res.status(out.status).json(out.json)
  } catch (e) {
    console.error('[api/auth/login]', e)
    res.status(500).json({ error: '登录接口执行失败' })
  }
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

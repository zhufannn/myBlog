/**
 * POST /api/auth/password — 校验原密码后更新 blog_users.password_hash
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runAuthPasswordChange } from '../lib/authCore'
import { getPostgresUrl } from '../lib/feedbackCore'
import { readJsonBody } from '../lib/readJsonBody'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }
    const out = await runAuthPasswordChange({
      body: readJsonBody(req.body),
      postgresUrl: getPostgresUrl(),
    })
    res.status(out.status).json(out.json)
  } catch (e) {
    console.error('[api/auth/password]', e)
    res.status(500).json({ error: '改密接口执行失败' })
  }
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

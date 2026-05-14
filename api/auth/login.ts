/**
 * POST /api/auth/login — 校验 blog_users，返回 memberId / displayName
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPostgresUrl } from '../../server/feedbackCore'
import { runAuthLogin } from '../../server/authCore'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }
  const out = await runAuthLogin({
    body: req.body,
    postgresUrl: getPostgresUrl(),
  })
  res.status(out.status).json(out.json)
}

export const config = {
  runtime: 'nodejs',
}

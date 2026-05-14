/**
 * POST /api/auth/password — 校验原密码后更新 blog_users.password_hash
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPostgresUrl } from '../../server/feedbackCore'
import { runAuthPasswordChange } from '../../server/authCore'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }
  const out = await runAuthPasswordChange({
    body: req.body,
    postgresUrl: getPostgresUrl(),
  })
  res.status(out.status).json(out.json)
}

export const config = {
  runtime: 'nodejs',
}

/**
 * POST /api/auth/logout — 清除 HttpOnly 会员会话 Cookie
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildMemberSessionClearCookie } from '../lib/memberSession.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }
    res.setHeader('Set-Cookie', buildMemberSessionClearCookie())
    res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[api/auth/logout]', e)
    res.status(500).json({ error: '注销失败' })
  }
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

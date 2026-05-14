/**
 * Vercel Serverless：反馈读写（逻辑在 api/lib/feedbackCore.ts）。
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPostgresUrl, runFeedbackApi } from './lib/feedbackCore'
import { readJsonBody } from './lib/readJsonBody'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const r = await runFeedbackApi({
      method: req.method,
      body: readJsonBody(req.body),
      postgresUrl: getPostgresUrl(),
    })
    res.status(r.status).json(r.json)
  } catch (e) {
    console.error('[api/feedback]', e)
    res.status(500).json({ error: '接口执行失败' })
  }
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

/**
 * Vercel Serverless：反馈读写（逻辑在 server/feedbackCore.ts）。
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPostgresUrl, runFeedbackApi } from '../server/feedbackCore'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const r = await runFeedbackApi({
    method: req.method,
    body: req.body,
    postgresUrl: getPostgresUrl(),
  })
  res.status(r.status).json(r.json)
}

export const config = {
  runtime: 'nodejs',
}

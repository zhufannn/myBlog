/**
 * 将 Vercel / Node 上可能为 string、Buffer 或已解析对象的 req.body 统一成 JSON。
 */
export function readJsonBody(raw: unknown): unknown {
  if (raw == null || raw === '') return null
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    return raw
  }
  const s =
    typeof raw === 'string'
      ? raw
      : Buffer.isBuffer(raw)
        ? raw.toString('utf8')
        : String(raw)
  const trimmed = s.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

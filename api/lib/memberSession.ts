/**
 * 无状态会员会话：HMAC 签名 Cookie，适合纯 Vercel（无需 Redis）。
 * 部署时在环境变量设置 SESSION_SECRET（建议 openssl rand -hex 32）。
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export const MEMBER_SESSION_COOKIE = 'pb_member'

const MAX_AGE_SEC = 7 * 24 * 60 * 60

export type MemberSessionPayload = { uid: string; exp: number }

function getSecret(): string | null {
  const s = process.env.SESSION_SECRET?.trim()
  return s || null
}

export function hasSessionSecret(): boolean {
  return Boolean(getSecret())
}

/** 签发会话令牌（无密钥时返回 null，登录仍可成功但不会下发 Cookie） */
export function createMemberSessionToken(userId: string): string | null {
  const secret = getSecret()
  if (!secret) return null
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC
  const payload: MemberSessionPayload = { uid: userId, exp }
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(b64).digest('base64url')
  return `${b64}.${sig}`
}

export function verifyMemberSessionToken(token: string): MemberSessionPayload | null {
  const secret = getSecret()
  if (!secret) return null
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const b64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expectedSig = createHmac('sha256', secret).update(b64).digest('base64url')
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expectedSig, 'utf8')
  if (a.length !== b.length) return null
  try {
    if (!timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  let payload: MemberSessionPayload
  try {
    payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as MemberSessionPayload
  } catch {
    return null
  }
  if (typeof payload.uid !== 'string' || typeof payload.exp !== 'number') return null
  if (Math.floor(Date.now() / 1000) > payload.exp) return null
  return payload
}

export function parseMemberSessionFromCookieHeader(cookieHeader: string | undefined): string | null {
  if (!cookieHeader?.trim()) return null
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const k = part.slice(0, idx).trim()
    if (k !== MEMBER_SESSION_COOKIE) continue
    const v = part.slice(idx + 1).trim()
    try {
      return decodeURIComponent(v)
    } catch {
      return v
    }
  }
  return null
}

/** 本地 http 调试可用 SESSION_COOKIE_INSECURE=1 跳过 Secure（生产勿用） */
function useSecureCookieFlag(): boolean {
  if (process.env.SESSION_COOKIE_INSECURE === '1') return false
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
}

export function buildMemberSessionSetCookie(token: string): string {
  const parts = [
    `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${MAX_AGE_SEC}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (useSecureCookieFlag()) parts.push('Secure')
  return parts.join('; ')
}

export function buildMemberSessionClearCookie(): string {
  const parts = [`${MEMBER_SESSION_COOKIE}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax']
  if (useSecureCookieFlag()) parts.push('Secure')
  return parts.join('; ')
}

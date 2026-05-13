/**
 * 极简前端门禁（仅供演示）：凭证明文存在于前端，可被绕过。
 * 会话仅存 sessionStorage，关闭标签页即需重新登录。
 * 角色：member（正式账号）、guest（游客）；旧值 zhufan-ok 视为 member。
 */

export type AuthRole = 'member' | 'guest'

export const AUTH_SESSION_KEY = 'personal-blog-session'

/** @deprecated 旧版会话值，仍会在 read 时识别为正式账号 */
export const AUTH_SESSION_VALUE = 'zhufan-ok'

const SESSION_MEMBER = 'member'
const SESSION_GUEST = 'guest'

/** 当前站点允许的演示账号（与需求一致） */
const DEMO_USER = 'zhufan'
const DEMO_PASS = 'zf195099'

/** 正式账号在反馈等区域展示的名称 */
export const MEMBER_PUBLIC_NAME = 'zhufan'

export function readAuthRole(): AuthRole | null {
  try {
    const v = sessionStorage.getItem(AUTH_SESSION_KEY)
    if (v === SESSION_MEMBER || v === AUTH_SESSION_VALUE) return 'member'
    if (v === SESSION_GUEST) return 'guest'
    return null
  } catch {
    return null
  }
}

export function readStoredAuth(): boolean {
  return readAuthRole() !== null
}

export function persistAuth(role: AuthRole): void {
  try {
    const val = role === 'member' ? SESSION_MEMBER : SESSION_GUEST
    sessionStorage.setItem(AUTH_SESSION_KEY, val)
  } catch {
    /* ignore */
  }
}

export function clearAuth(): void {
  try {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function validateCredentials(username: string, password: string): boolean {
  return username.trim() === DEMO_USER && password === DEMO_PASS
}

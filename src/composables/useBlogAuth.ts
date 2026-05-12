/**
 * 极简前端门禁（仅供演示）：凭证明文存在于前端，可被绕过。
 * 会话仅存 sessionStorage，关闭标签页即需重新登录。
 */

export const AUTH_SESSION_KEY = 'personal-blog-session'
export const AUTH_SESSION_VALUE = 'zhufan-ok'

/** 当前站点允许的演示账号（与需求一致） */
const DEMO_USER = 'zhufan'
const DEMO_PASS = 'zf195099'

export function readStoredAuth(): boolean {
  try {
    return sessionStorage.getItem(AUTH_SESSION_KEY) === AUTH_SESSION_VALUE
  } catch {
    return false
  }
}

export function persistAuth(ok: boolean): void {
  try {
    if (ok) sessionStorage.setItem(AUTH_SESSION_KEY, AUTH_SESSION_VALUE)
    else sessionStorage.removeItem(AUTH_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function validateCredentials(username: string, password: string): boolean {
  return username.trim() === DEMO_USER && password === DEMO_PASS
}

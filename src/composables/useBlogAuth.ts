/**
 * 前端门禁：正式账号密码在服务端数据库 blog_users（bcrypt）；
 * 会话仅存 sessionStorage；游客无需账号。
 */

export type AuthRole = 'member' | 'guest'

export const AUTH_SESSION_KEY = 'personal-blog-session'

/** @deprecated 旧版会话值，仍会在 read 时识别为正式账号 */
export const AUTH_SESSION_VALUE = 'zhufan-ok'

const SESSION_MEMBER = 'member'
const SESSION_GUEST = 'guest'

const AUTH_MEMBER_ID_KEY = 'personal-blog-member-id'

/** 登录后服务端返回的展示名缓存 */
const AUTH_MEMBER_DISPLAY_KEY = 'personal-blog-member-display'

/** 兼容历史：曾与 id 一致的演示名 */
export type MemberId = string

/** @deprecated 使用 readMemberDisplayName */
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

export function readMemberId(): MemberId | null {
  if (readAuthRole() !== 'member') return null
  try {
    const raw = sessionStorage.getItem(AUTH_MEMBER_ID_KEY)
    if (raw?.trim()) return raw.trim()
    /** 仅含旧版 member 会话、无 id 时视为 zhufan */
    return 'zhufan'
  } catch {
    return 'zhufan'
  }
}

export function readMemberDisplayName(): string {
  try {
    const d = sessionStorage.getItem(AUTH_MEMBER_DISPLAY_KEY)
    if (d?.trim()) return d.trim()
  } catch {
    /* ignore */
  }
  const id = readMemberId()
  return id ?? MEMBER_PUBLIC_NAME
}

export function readStoredAuth(): boolean {
  return readAuthRole() !== null
}

export function persistAuth(
  role: AuthRole,
  memberId?: MemberId,
  displayName?: string,
): void {
  try {
    const val = role === 'member' ? SESSION_MEMBER : SESSION_GUEST
    sessionStorage.setItem(AUTH_SESSION_KEY, val)
    if (role === 'member' && memberId) {
      sessionStorage.setItem(AUTH_MEMBER_ID_KEY, memberId)
      if (displayName?.trim()) {
        sessionStorage.setItem(AUTH_MEMBER_DISPLAY_KEY, displayName.trim())
      }
    } else {
      sessionStorage.removeItem(AUTH_MEMBER_ID_KEY)
      sessionStorage.removeItem(AUTH_MEMBER_DISPLAY_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function clearAuth(): void {
  try {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    sessionStorage.removeItem(AUTH_MEMBER_ID_KEY)
    sessionStorage.removeItem(AUTH_MEMBER_DISPLAY_KEY)
  } catch {
    /* ignore */
  }
}

const AUTH_LOGIN = '/api/auth/login'
const AUTH_PASSWORD = '/api/auth/password'

export async function loginMemberRemote(
  username: string,
  password: string,
): Promise<
  | { ok: true; memberId: string; displayName: string }
  | { ok: false; error: string }
> {
  try {
    const r = await fetch(AUTH_LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ username, password }),
    })
    const text = await r.text()
    let data: unknown
    try {
      data = text ? (JSON.parse(text) as unknown) : null
    } catch {
      data = null
    }
    if (!r.ok) {
      const msg =
        data &&
        typeof data === 'object' &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : '登录失败'
      return { ok: false, error: msg }
    }
    if (
      data &&
      typeof data === 'object' &&
      typeof (data as { memberId?: unknown }).memberId === 'string' &&
      typeof (data as { displayName?: unknown }).displayName === 'string'
    ) {
      const { memberId, displayName } = data as { memberId: string; displayName: string }
      return { ok: true, memberId, displayName }
    }
    return { ok: false, error: '服务器返回无效' }
  } catch {
    return { ok: false, error: '无法连接登录服务（请检查网络与数据库配置）' }
  }
}

export async function changeMemberPasswordRemote(
  memberId: MemberId,
  oldPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = await fetch(AUTH_PASSWORD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ memberId, oldPassword, newPassword }),
    })
    const text = await r.text()
    let data: unknown
    try {
      data = text ? (JSON.parse(text) as unknown) : null
    } catch {
      data = null
    }
    if (!r.ok) {
      const msg =
        data &&
        typeof data === 'object' &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : '修改失败'
      return { ok: false, error: msg }
    }
    if (data && typeof data === 'object' && 'ok' in data && (data as { ok: unknown }).ok === true) {
      return { ok: true }
    }
    return { ok: false, error: '服务器返回无效' }
  } catch {
    return { ok: false, error: '无法连接服务' }
  }
}

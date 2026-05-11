import { cookies } from 'next/headers'

export const ADMIN_SESSION_COOKIE = 'admin_session'
/** Valores: `master` ou `1`…`4` (guichê). */
export const ADMIN_ROLE_COOKIE = 'admin_login_role'

export type AdminCookieRole =
  | { kind: 'master' }
  | { kind: 'guiche'; guicheNum: number }

async function cookieStore() {
  return cookies()
}

export async function readAdminLogin(): Promise<AdminCookieRole | null> {
  const store = await cookieStore()
  if (!store.get(ADMIN_SESSION_COOKIE)?.value) return null

  const roleRaw = store.get(ADMIN_ROLE_COOKIE)?.value ?? ''
  if (roleRaw === 'master') return { kind: 'master' }

  const n = parseInt(roleRaw, 10)
  if (Number.isInteger(n) && n >= 1 && n <= 4) return { kind: 'guiche', guicheNum: n }

  return null
}

export async function writeAdminCookies(params: AdminCookieRole) {
  const store = await cookieStore()
  const token = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64')
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 8,
  }

  store.set(ADMIN_SESSION_COOKIE, token, cookieOptions)

  const roleValue = params.kind === 'master' ? 'master' : String(params.guicheNum)
  store.set(ADMIN_ROLE_COOKIE, roleValue, cookieOptions)
}

export async function clearAdminCookies() {
  const store = await cookieStore()
  store.delete(ADMIN_SESSION_COOKIE)
  store.delete(ADMIN_ROLE_COOKIE)
}

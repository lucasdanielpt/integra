import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { readAdminLogin } from '@/lib/server-admin-auth'

export const PAINEL_GATE_COOKIE = 'painel_gate'

const COOKIE_MAX_AGE_SEC = 90 * 24 * 60 * 60

function gateSecret(): string | null {
  const s = process.env.PAINEL_DISPLAY_PASSWORD?.trim()
  if (s) return s
  if (process.env.NODE_ENV !== 'production') return 'integrapainel-dev-only'
  return null
}

export function isPainelPasswordConfigured(): boolean {
  return gateSecret() !== null
}

export function verifyPainelPassword(plain: string): boolean {
  const expected = gateSecret()
  if (!expected || !plain) return false
  try {
    const a = Buffer.from(plain, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function signPayload(expUnix: number, secret: string): string {
  return createHmac('sha256', secret).update(`painel|${expUnix}`).digest('base64url')
}

export function mintPainelGateCookieValue(): string | null {
  const secret = gateSecret()
  if (!secret) return null
  const expUnix = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SEC
  return `${expUnix}.${signPayload(expUnix, secret)}`
}

export function verifyPainelGateCookieValue(raw: string | undefined): boolean {
  const secret = gateSecret()
  if (!raw || !secret) return false
  const dot = raw.indexOf('.')
  if (dot === -1) return false
  const expUnix = Number.parseInt(raw.slice(0, dot), 10)
  if (!Number.isFinite(expUnix) || expUnix * 1000 < Date.now()) return false
  const sig = raw.slice(dot + 1)
  const expected = signPayload(expUnix, secret)
  try {
    const a = Buffer.from(sig, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** Leitura completa da fila: admin logado ou TV com cookie do painel. */
export async function canReadFullQueueForPainel(): Promise<boolean> {
  if (await readAdminLogin()) return true
  const store = await cookies()
  return verifyPainelGateCookieValue(store.get(PAINEL_GATE_COOKIE)?.value)
}

export const painelGateCookieOptions = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/' as const,
  maxAge: COOKIE_MAX_AGE_SEC,
}

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  PAINEL_GATE_COOKIE,
  isPainelPasswordConfigured,
  mintPainelGateCookieValue,
  painelGateCookieOptions,
  verifyPainelGateCookieValue,
  verifyPainelPassword,
} from '@/lib/painel-gate'

export const dynamic = 'force-dynamic'

export async function GET() {
  const store = await cookies()
  const ok = verifyPainelGateCookieValue(store.get(PAINEL_GATE_COOKIE)?.value)
  return NextResponse.json({ authenticated: ok })
}

export async function POST(request: Request) {
  if (!isPainelPasswordConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Painel não configurado. Defina PAINEL_DISPLAY_PASSWORD nas variáveis de ambiente (Vercel → Production).',
      },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Envie um JSON válido.' },
      { status: 400 }
    )
  }

  const rec =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : null
  const password = typeof rec?.password === 'string' ? rec.password : ''

  if (!password) {
    return NextResponse.json(
      { success: false, error: 'Informe a senha do painel.' },
      { status: 400 }
    )
  }

  if (!verifyPainelPassword(password)) {
    return NextResponse.json(
      { success: false, error: 'Senha incorreta.' },
      { status: 401 }
    )
  }

  const payload = mintPainelGateCookieValue()
  if (!payload) {
    return NextResponse.json(
      { success: false, error: 'Erro ao criar sessão do painel.' },
      { status: 500 }
    )
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(PAINEL_GATE_COOKIE, payload, painelGateCookieOptions)
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(PAINEL_GATE_COOKIE, '', { ...painelGateCookieOptions, maxAge: 0 })
  return res
}

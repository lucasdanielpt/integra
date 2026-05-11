import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_ROLE_COOKIE,
  clearAdminCookies,
  writeAdminCookies,
} from '@/lib/server-admin-auth'
import {
  verifyGuicheCredentials,
  verifyMasterCredentialsOrBootstrap,
} from '@/lib/staff-accounts'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const action = body.action as string | undefined

    if (action === 'logout') {
      await clearAdminCookies()
      return NextResponse.json({ success: true })
    }

    const password = typeof body.password === 'string' ? body.password : ''
    const mode = body.mode === 'master' ? 'master' : 'guiche'
    const requestedGuiche =
      typeof body.guiche === 'number'
        ? body.guiche
        : typeof body.guiche === 'string'
          ? parseInt(body.guiche, 10)
          : undefined

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Informe a senha' },
        { status: 400 }
      )
    }

    if (mode === 'master') {
      const { ok } = await verifyMasterCredentialsOrBootstrap(password)
      if (ok) {
        await writeAdminCookies({ kind: 'master' })
        return NextResponse.json({
          success: true,
          role: 'master' as const,
          guiche: null,
        })
      }

      return NextResponse.json(
        {
          success: false,
          error:
            'Senha incorreta. No primeiro deploy, defina ADMIN_MASTER_PASSWORD (ou ADMIN_PASSWORD) na hospedagem, faça login com essa senha e depois troque-a em “Contas da recepção”.',
        },
        { status: 401 }
      )
    }

    const gn =
      typeof requestedGuiche === 'number' &&
      requestedGuiche >= 1 &&
      requestedGuiche <= 4
        ? requestedGuiche
        : undefined
    if (gn === undefined) {
      return NextResponse.json(
        { success: false, error: 'Selecione o guichê (1–4)' },
        { status: 400 }
      )
    }

    const match = await verifyGuicheCredentials(gn, password)
    if (match) {
      await writeAdminCookies({ kind: 'guiche', guicheNum: gn })
      return NextResponse.json({
        success: true,
        role: 'guiche' as const,
        guiche: gn,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error:
          'Senha incorreta ou guichê ainda sem conta. A coordenação pode cadastrar a senha na área “Contas da recepção”.',
      },
      { status: 401 }
    )
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro no servidor' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const store = await cookies()
  const hasSession = !!store.get(ADMIN_SESSION_COOKIE)?.value
  const roleRaw = store.get(ADMIN_ROLE_COOKIE)?.value

  if (!hasSession || !roleRaw) {
    return NextResponse.json({
      authenticated: false,
      role: null as string | null,
      guiche: null as number | null,
    })
  }

  if (roleRaw === 'master') {
    return NextResponse.json({
      authenticated: true,
      role: 'master' as const,
      guiche: null as null,
    })
  }

  const n = parseInt(roleRaw, 10)
  if (Number.isInteger(n) && n >= 1 && n <= 4) {
    return NextResponse.json({
      authenticated: true,
      role: 'guiche' as const,
      guiche: n,
    })
  }

  await clearAdminCookies()
  return NextResponse.json({
    authenticated: false,
    role: null as string | null,
    guiche: null as number | null,
  })
}

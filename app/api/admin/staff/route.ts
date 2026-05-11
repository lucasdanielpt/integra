import { NextResponse } from 'next/server'
import {
  upsertStaffAccountPassword,
  getStaffDeskStatus,
  validateNewStaffPassword,
} from '@/lib/staff-accounts'
import { readAdminLogin } from '@/lib/server-admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const login = await readAdminLogin()
  if (!login || login.kind !== 'master') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  try {
    const status = await getStaffDeskStatus()
    return NextResponse.json(status)
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível carregar as contas cadastradas.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const login = await readAdminLogin()
  if (!login || login.kind !== 'master') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const rec =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : null
  if (!rec) return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })

  const deskSlot =
    typeof rec.deskSlot === 'number'
      ? rec.deskSlot
      : typeof rec.deskSlot === 'string'
        ? parseInt(rec.deskSlot, 10)
        : NaN

  const passwordRaw = typeof rec.password === 'string' ? rec.password : ''
  const password = passwordRaw.trim()

  if (Number.isNaN(deskSlot) || deskSlot < 0 || deskSlot > 4) {
    return NextResponse.json(
      {
        error:
          'Parâmetro inválido: use deskSlot 0 para coordenação ou 1 a 4 para guichês.',
      },
      { status: 400 }
    )
  }

  const err = validateNewStaffPassword(password)
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 })
  }

  try {
    await upsertStaffAccountPassword({ deskSlot, plainPassword: password })
    const status = await getStaffDeskStatus()
    return NextResponse.json({ success: true, ...status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao salvar.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

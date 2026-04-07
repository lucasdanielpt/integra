import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'integra2024'
const SESSION_TOKEN = 'admin_session'

export async function POST(request: Request) {
  try {
    const { password, action } = await request.json()

    if (action === 'logout') {
      const cookieStore = await cookies()
      cookieStore.delete(SESSION_TOKEN)
      return NextResponse.json({ success: true })
    }

    if (password === ADMIN_PASSWORD) {
      const cookieStore = await cookies()
      const token = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64')
      
      cookieStore.set(SESSION_TOKEN, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 8, // 8 horas
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: 'Senha incorreta' },
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
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_TOKEN)

  return NextResponse.json({
    authenticated: !!session?.value,
  })
}

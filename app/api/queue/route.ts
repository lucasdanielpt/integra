import { NextResponse } from 'next/server'
import {
  getQueueState,
  generateTicket,
  callNextTicket,
  resetQueue,
  checkCpfQueueStatus,
} from '@/lib/queue-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = await getQueueState()
  return NextResponse.json(state)
}

export async function POST(request: Request) {
  let action: string | undefined
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Envie um JSON válido na requisição.' },
        { status: 400 }
      )
    }

    const rec =
      body !== null && typeof body === 'object'
        ? (body as Record<string, unknown>)
        : null
    if (!rec) {
      return NextResponse.json(
        { error: 'Corpo da requisição inválido.' },
        { status: 400 }
      )
    }

    action = typeof rec.action === 'string' ? rec.action : undefined
    const name = typeof rec.name === 'string' ? rec.name : ''
    const cpf = typeof rec.cpf === 'string' ? rec.cpf : ''
    const phone = typeof rec.phone === 'string' ? rec.phone : ''

    switch (rec.action) {
      case 'check': {
        const result = await checkCpfQueueStatus(cpf)
        if (!result.ok) {
          return NextResponse.json(
            { error: result.error, ...result.state },
            { status: 400 }
          )
        }
        return NextResponse.json(result)
      }

      case 'generate': {
        const result = await generateTicket({ name, cpf, phone })
        if (!result.ok) {
          return NextResponse.json(
            { error: result.error, ...result.state },
            { status: 400 }
          )
        }
        return NextResponse.json({
          ticket: result.ticket,
          alreadyInQueue: result.alreadyInQueue,
          peopleAhead: result.peopleAhead,
          ...result.state,
        })
      }

      case 'call': {
        const result = await callNextTicket()
        if (!result.ok) {
          return NextResponse.json(
            { error: result.error, ...result.state },
            { status: 400 }
          )
        }
        return NextResponse.json({
          called: result.called,
          ticket_info: result.ticket_info,
          ...result.state,
        })
      }

      case 'reset': {
        const state = await resetQueue()
        return NextResponse.json({ message: 'Fila zerada', ...state })
      }

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }
  } catch (e) {
    // Nunca logar corpo da requisição (pode conter CPF/nome/telefone).
    const label = action ?? 'desconhecida'
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[api/queue] erro interno ação=${label}`, msg)
    return NextResponse.json(
      { error: 'Serviço temporariamente indisponível. Tente de novo em instantes.' },
      { status: 500 }
    )
  }
}

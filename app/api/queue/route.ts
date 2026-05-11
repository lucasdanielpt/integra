import { NextResponse } from 'next/server'
import {
  getQueueState,
  generateTicket,
  callNextTicket,
  resetQueue,
} from '@/lib/queue-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = await getQueueState()
  return NextResponse.json(state)
}

export async function POST(request: Request) {
  const { action, name, cpf } = await request.json()

  switch (action) {
    case 'generate': {
      const result = await generateTicket({
        name: typeof name === 'string' ? name : '',
        cpf: typeof cpf === 'string' ? cpf : '',
      })
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
}

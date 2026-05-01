import { NextResponse } from 'next/server'
import {
  getQueueState,
  generateTicket,
  callNextTicket,
  resetQueue,
  getTicketById,
} from '@/lib/queue-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = getQueueState()
  return NextResponse.json(state)
}

export async function POST(request: Request) {
  const { action, name, cpf } = await request.json()

  switch (action) {
    case 'generate':
      const ticket = generateTicket({ name, cpf })
      return NextResponse.json({ ticket, ...getQueueState() })

    case 'call':
      const called = callNextTicket()
      if (called === null) {
        return NextResponse.json(
          { error: 'Não há senhas na fila', ...getQueueState() },
          { status: 400 }
        )
      }
      const ticket_info = getTicketById(called)
      return NextResponse.json({ called, ticket_info, ...getQueueState() })

    case 'reset':
      resetQueue()
      return NextResponse.json({ message: 'Fila zerada', ...getQueueState() })

    default:
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }
}

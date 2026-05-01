// In-memory queue store (in production, use a database)
interface QueueTicket {
  id: number
  name: string
  cpf: string
}

interface QueueState {
  currentTicket: number
  lastTicket: number
  calledAt: Date | null
  tickets: QueueTicket[]
  currentTicketInfo: QueueTicket | null
}

let queueState: QueueState = {
  currentTicket: 0,
  lastTicket: 0,
  calledAt: null,
  tickets: [],
  currentTicketInfo: null,
}

export function getQueueState(): QueueState {
  return { ...queueState }
}

export function generateTicket({
  name,
  cpf,
}: {
  name: string
  cpf: string
}): number {
  const ticket: QueueTicket = {
    id: queueState.lastTicket + 1,
    name: name.trim(),
    cpf: cpf.trim(),
  }
  queueState.tickets.push(ticket)
  queueState.lastTicket += 1
  return queueState.lastTicket
}

export function callNextTicket(): number | null {
  if (queueState.currentTicket < queueState.lastTicket) {
    queueState.currentTicket += 1
    queueState.currentTicketInfo =
      getTicketById(queueState.currentTicket) ?? null
    queueState.calledAt = new Date()
    return queueState.currentTicket
  }
  return null
}

export function getTicketById(id: number | null): QueueTicket | undefined {
  return queueState.tickets.find((t) => t.id === id)
}

export function resetQueue(): void {
  queueState = {
    currentTicket: 0,
    lastTicket: 0,
    calledAt: null,
    tickets: [],
    currentTicketInfo: null,
  }
}

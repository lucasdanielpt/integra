// In-memory queue store (in production, use a database)
interface QueueState {
  currentTicket: number
  lastTicket: number
  calledAt: Date | null
}

let queueState: QueueState = {
  currentTicket: 0,
  lastTicket: 0,
  calledAt: null,
}

export function getQueueState(): QueueState {
  return { ...queueState }
}

export function generateTicket(): number {
  queueState.lastTicket += 1
  return queueState.lastTicket
}

export function callNextTicket(): number | null {
  if (queueState.currentTicket < queueState.lastTicket) {
    queueState.currentTicket += 1
    queueState.calledAt = new Date()
    return queueState.currentTicket
  }
  return null
}

export function resetQueue(): void {
  queueState = {
    currentTicket: 0,
    lastTicket: 0,
    calledAt: null,
  }
}

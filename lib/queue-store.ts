// In-memory queue store (in production, use a database)

interface QueueTicket {
  id: number;
  name: string;
  email: string | null;
  tel: string;
}

interface QueueState {
  tickets: QueueTicket[];
  currentTicket: number;
  lastTicket: number;
  currentTicketInfo: QueueTicket | null;
  calledAt: Date | null;
}

let queueState: QueueState = {
  tickets: [],
  currentTicket: 0,
  lastTicket: 0,
  currentTicketInfo: null,
  calledAt: null,
};

export function getQueueState(): QueueState {
  return { ...queueState };
}

export function generateTicket({
  name,
  email,
  tel,
}: {
  name: string;
  email: string;
  tel: string;
}): number {
  const ticket: QueueTicket = {
    id: queueState.lastTicket + 1,
    name,
    email,
    tel,
  };
  queueState.tickets.push(ticket);
  queueState.lastTicket += 1;
  return queueState.lastTicket;
}

export function callNextTicket(): number | null {
  if (queueState.currentTicket < queueState.lastTicket) {
    queueState.currentTicket += 1;
    queueState.currentTicketInfo = getTicketById(queueState.currentTicket) ?? null;
    queueState.calledAt = new Date();
    return queueState.currentTicket;
  }
  return null;
}

export function getTicketById(id: number | null): QueueTicket | undefined {
  return queueState.tickets.find((t) => t.id === id);
}

export function resetQueue(): void {
  queueState = {
    tickets: [],
    currentTicket: 0,
    lastTicket: 0,
    currentTicketInfo: null,
    calledAt: null,
  };
}

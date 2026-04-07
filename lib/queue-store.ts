// In-memory queue store (in production, use a database)

import { Ticket } from "lucide-react";

interface Ticket {
  id: number;
  name: string;
  email: string | null;
  tel: string;
}

interface QueueState {
  ticket: Ticket[] | null;
  currentTicket: number;
  lastTicket: number;
  calledAt: Date | null;
}

let queueState: QueueState = {
  ticket: null,
  currentTicket: 0,
  lastTicket: 0,
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
  const ticket: Ticket = {
    id: queueState.lastTicket + 1,
    name,
    email,
    tel,
  };
  queueState.ticket?.push(ticket);
  queueState.lastTicket += 1;
  return queueState.lastTicket;
}

export function callNextTicket(): number | null {
  if (queueState.currentTicket < queueState.lastTicket) {
    queueState.currentTicket += 1;
    queueState.calledAt = new Date();
    return queueState.currentTicket;
  }
  return null;
}

export function resetQueue(): void {
  queueState = {
    ticket: null,
    currentTicket: 0,
    lastTicket: 0,
    calledAt: null,
  };
}

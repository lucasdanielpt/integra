import type { QueueStateJson } from '@/lib/queue-service'

/** Resumo sem nomes de outros pacientes (totem/celular acompanham só números da TV). */
export type PublicQueueSnapshot = {
  access: 'public'
  currentTicket: number
  lastTicket: number
  calledAt: string | null
}

export function toPublicQueueSnapshot(state: QueueStateJson): PublicQueueSnapshot {
  return {
    access: 'public',
    currentTicket: state.currentTicket,
    lastTicket: state.lastTicket,
    calledAt: state.calledAt,
  }
}

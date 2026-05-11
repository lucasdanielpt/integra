import type { Patient, QueueSession } from '@prisma/client'
import { QueueTicketStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { brazilTodayDate } from '@/lib/queue-date'
import { isValidCpfLength, normalizeCpf } from '@/lib/cpf'

export type PublicTicketInfo = {
  id: number
  name: string
  cpf: string
}

export type QueueStateJson = {
  currentTicket: number
  lastTicket: number
  calledAt: string | null
  tickets: PublicTicketInfo[]
  currentTicketInfo: PublicTicketInfo | null
}

function sessionToTicketInfo(
  session: QueueSession & { patient: Patient }
): PublicTicketInfo {
  const cpfDigits = session.patient.cpfNormalized
  return {
    id: session.ticketNumber,
    name: session.patient.fullName,
    cpf: formatCpfDisplay(cpfDigits),
  }
}

function formatCpfDisplay(digits: string): string {
  if (digits.length !== 11) return digits
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

async function loadStateForDate(queueDate: Date): Promise<{
  lastTicket: number
  currentTicket: number
  currentTicketInfo: PublicTicketInfo | null
  calledAt: Date | null
  sessions: (QueueSession & { patient: Patient })[]
}> {
  const sessions = await prisma.queueSession.findMany({
    where: { queueDate },
    include: { patient: true },
    orderBy: { ticketNumber: 'asc' },
  })

  const issued = sessions.filter((s) => s.status !== QueueTicketStatus.CANCELLED)
  const lastTicket =
    issued.length === 0 ? 0 : Math.max(...issued.map((s) => s.ticketNumber))

  const called = sessions.find((s) => s.status === QueueTicketStatus.CALLED)
  const currentTicket = called?.ticketNumber ?? 0
  const currentTicketInfo = called ? sessionToTicketInfo(called) : null
  const calledAt = called?.calledAt ?? null

  return {
    lastTicket,
    currentTicket,
    currentTicketInfo,
    calledAt,
    sessions,
  }
}

export async function getQueueState(): Promise<QueueStateJson> {
  const queueDate = brazilTodayDate()
  const { lastTicket, currentTicket, currentTicketInfo, calledAt, sessions } =
    await loadStateForDate(queueDate)

  const tickets: PublicTicketInfo[] = sessions
    .filter((s) => s.status !== QueueTicketStatus.CANCELLED)
    .map(sessionToTicketInfo)

  return {
    currentTicket,
    lastTicket,
    calledAt: calledAt?.toISOString() ?? null,
    tickets,
    currentTicketInfo,
  }
}

function peopleAhead(
  userTicket: number,
  currentTicket: number,
  userStatus: QueueTicketStatus
): number {
  if (userStatus === QueueTicketStatus.CALLED) return 0
  if (currentTicket === 0) return Math.max(0, userTicket - 1)
  return Math.max(0, userTicket - currentTicket - 1)
}

export type GenerateResult =
  | {
      ok: true
      ticket: number
      alreadyInQueue: boolean
      peopleAhead: number
      state: QueueStateJson
    }
  | { ok: false; error: string; state: QueueStateJson }

export async function generateTicket(input: {
  name: string
  cpf: string
}): Promise<GenerateResult> {
  const baseState = await getQueueState()
  const cpf = normalizeCpf(input.cpf)
  if (!isValidCpfLength(cpf)) {
    return { ok: false, error: 'CPF deve conter 11 dígitos.', state: baseState }
  }

  const queueDate = brazilTodayDate()
  const nameTrim = input.name.trim()

  const existingPatient = await prisma.patient.findUnique({
    where: { cpfNormalized: cpf },
  })

  if (!existingPatient) {
    if (!nameTrim) {
      return {
        ok: false,
        error: 'Informe o nome completo para o primeiro cadastro.',
        state: baseState,
      }
    }
  }

  const patient =
    existingPatient ??
    (await prisma.patient.create({
      data: { cpfNormalized: cpf, fullName: nameTrim },
    }))

  const active = await prisma.queueSession.findFirst({
    where: {
      patientId: patient.id,
      queueDate,
      status: { in: [QueueTicketStatus.WAITING, QueueTicketStatus.CALLED] },
    },
    include: { patient: true },
  })

  const stateAfter = await getQueueState()

  if (active) {
    return {
      ok: true,
      ticket: active.ticketNumber,
      alreadyInQueue: true,
      peopleAhead: peopleAhead(
        active.ticketNumber,
        stateAfter.currentTicket,
        active.status
      ),
      state: stateAfter,
    }
  }

  const ticketNumber = await prisma.$transaction(async (tx) => {
    const agg = await tx.queueSession.aggregate({
      where: { queueDate },
      _max: { ticketNumber: true },
    })
    const next = (agg._max.ticketNumber ?? 0) + 1
    await tx.queueSession.create({
      data: {
        ticketNumber: next,
        patientId: patient.id,
        queueDate,
        status: QueueTicketStatus.WAITING,
      },
    })
    return next
  })

  const state = await getQueueState()
  return {
    ok: true,
    ticket: ticketNumber,
    alreadyInQueue: false,
    peopleAhead: peopleAhead(
      ticketNumber,
      state.currentTicket,
      QueueTicketStatus.WAITING
    ),
    state,
  }
}

export async function callNextTicket(): Promise<
  | { ok: true; called: number; ticket_info: PublicTicketInfo; state: QueueStateJson }
  | { ok: false; error: string; state: QueueStateJson }
> {
  const queueDate = brazilTodayDate()

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.queueSession.updateMany({
        where: {
          queueDate,
          status: QueueTicketStatus.CALLED,
        },
        data: {
          status: QueueTicketStatus.DONE,
        },
      })

      const nextWaiting = await tx.queueSession.findFirst({
        where: { queueDate, status: QueueTicketStatus.WAITING },
        orderBy: { ticketNumber: 'asc' },
        include: { patient: true },
      })

      if (!nextWaiting) {
        return null
      }

      const updated = await tx.queueSession.update({
        where: { id: nextWaiting.id },
        data: {
          status: QueueTicketStatus.CALLED,
          calledAt: new Date(),
        },
        include: { patient: true },
      })

      return updated
    })

    const state = await getQueueState()

    if (!result) {
      return {
        ok: false,
        error: 'Não há senhas na fila',
        state,
      }
    }

    return {
      ok: true,
      called: result.ticketNumber,
      ticket_info: sessionToTicketInfo(result),
      state,
    }
  } catch {
    const state = await getQueueState()
    return { ok: false, error: 'Erro ao chamar senha.', state }
  }
}

export async function resetQueue(): Promise<QueueStateJson> {
  const queueDate = brazilTodayDate()
  await prisma.queueSession.deleteMany({
    where: { queueDate },
  })
  return getQueueState()
}

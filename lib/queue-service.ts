import type { Patient, QueueSession } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { QueueTicketStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { brazilTodayDate } from '@/lib/queue-date'
import { normalizeCpf, rejectionMessageForCpfInput } from '@/lib/cpf'
import {
  formatPhoneDisplay,
  isValidBrMobileDigits,
  normalizePhone,
} from '@/lib/phone'

export type PublicTicketInfo = {
  id: number
  name: string
  cpf: string
  phone: string | null
  /** 1–4 após chamada no guichê; null enquanto aguarda */
  calledGuiche: number | null
}

export type QueueBoardRow = {
  ticketNumber: number
  status: 'WAITING' | 'CALLED'
  patientName: string
  cpf: string
  phone: string | null
  calledGuiche: number | null
}

export type QueueStateJson = {
  currentTicket: number
  lastTicket: number
  calledAt: string | null
  tickets: PublicTicketInfo[]
  currentTicketInfo: PublicTicketInfo | null
  waitingBoard: QueueBoardRow[]
  /** Primeiro WAITING na ordem (redundante com nextWaitingTickets[0]) para compatível com consumidores antigos */
  nextTicketInfo: PublicTicketInfo | null
  /** Até os 3 primeiros WAITING (ordem por senha) para pré-visualização no painel */
  nextWaitingTickets: PublicTicketInfo[]
}

function sessionToTicketInfo(
  session: QueueSession & { patient: Patient }
): PublicTicketInfo {
  const cpfDigits = session.patient.cpfNormalized
  const phoneDigits = session.patient.phoneNormalized
  return {
    id: session.ticketNumber,
    name: session.patient.fullName,
    cpf: formatCpfDisplay(cpfDigits),
    phone:
      phoneDigits && isValidBrMobileDigits(phoneDigits)
        ? formatPhoneDisplay(phoneDigits)
        : null,
    calledGuiche: session.calledGuiche ?? null,
  }
}

function formatCpfDisplay(digits: string): string {
  if (digits.length !== 11) return digits
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function patientPhoneDisplay(p: Patient): string | null {
  const d = p.phoneNormalized
  if (!d || !isValidBrMobileDigits(d)) return null
  return formatPhoneDisplay(d)
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

  const waitingBoard: QueueBoardRow[] = sessions
    .filter(
      (s) =>
        s.status === QueueTicketStatus.WAITING ||
        s.status === QueueTicketStatus.CALLED
    )
    .sort((a, b) => a.ticketNumber - b.ticketNumber)
    .map((s) => ({
      ticketNumber: s.ticketNumber,
      status:
        s.status === QueueTicketStatus.WAITING
          ? ('WAITING' as const)
          : ('CALLED' as const),
      patientName: s.patient.fullName,
      cpf: formatCpfDisplay(s.patient.cpfNormalized),
      phone:
        s.patient.phoneNormalized &&
        isValidBrMobileDigits(s.patient.phoneNormalized)
          ? formatPhoneDisplay(s.patient.phoneNormalized)
          : null,
      calledGuiche: s.calledGuiche ?? null,
    }))

  const nextWaitingSorted = sessions
    .filter((s) => s.status === QueueTicketStatus.WAITING)
    .sort((a, b) => a.ticketNumber - b.ticketNumber)
  const nextWaitingTickets = nextWaitingSorted
    .slice(0, 3)
    .map(sessionToTicketInfo)
  const nextTicketInfo = nextWaitingTickets[0] ?? null

  return {
    currentTicket,
    lastTicket,
    calledAt: calledAt?.toISOString() ?? null,
    tickets,
    currentTicketInfo,
    waitingBoard,
    nextTicketInfo,
    nextWaitingTickets,
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

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  )
}

export type CheckCpfResult =
  | { ok: false; error: string; state: QueueStateJson }
  | {
      ok: true
      phase: 'in_queue'
      ticket: number
      peopleAhead: number
      patientName: string
      patientPhone: string | null
      state: QueueStateJson
    }
  | {
      ok: true
      phase: 'can_take_ticket'
      needsRegistration: boolean
      patientName: string | null
      patientPhone: string | null
      state: QueueStateJson
    }

/** Consulta CPF: fila ativa ou dados para retirar senha. */
export async function checkCpfQueueStatus(cpfRaw: string): Promise<CheckCpfResult> {
  const state = await getQueueState()
  const cpfErr = rejectionMessageForCpfInput(cpfRaw)
  if (cpfErr) {
    return { ok: false, error: cpfErr, state }
  }
  const cpf = normalizeCpf(cpfRaw)

  const queueDate = brazilTodayDate()
  const patient = await prisma.patient.findUnique({
    where: { cpfNormalized: cpf },
  })

  if (!patient) {
    return {
      ok: true,
      phase: 'can_take_ticket',
      needsRegistration: true,
      patientName: null,
      patientPhone: null,
      state,
    }
  }

  const active = await prisma.queueSession.findFirst({
    where: {
      patientId: patient.id,
      queueDate,
      status: { in: [QueueTicketStatus.WAITING, QueueTicketStatus.CALLED] },
    },
    include: { patient: true },
  })

  if (active) {
    return {
      ok: true,
      phase: 'in_queue',
      ticket: active.ticketNumber,
      peopleAhead: peopleAhead(
        active.ticketNumber,
        state.currentTicket,
        active.status
      ),
      patientName: patient.fullName,
      patientPhone: patientPhoneDisplay(patient),
      state,
    }
  }

  return {
    ok: true,
    phase: 'can_take_ticket',
    needsRegistration: false,
    patientName: patient.fullName,
    patientPhone: patientPhoneDisplay(patient),
    state,
  }
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

type TxInner =
  | { kind: 'need_profile' }
  | { kind: 'existing'; active: QueueSession & { patient: Patient } }
  | { kind: 'new'; ticketNumber: number }

export async function generateTicket(input: {
  name: string
  cpf: string
  phone: string
}): Promise<GenerateResult> {
  const baseState = await getQueueState()
  const cpfErr = rejectionMessageForCpfInput(input.cpf)
  if (cpfErr) {
    return { ok: false, error: cpfErr, state: baseState }
  }
  const cpf = normalizeCpf(input.cpf)

  const queueDate = brazilTodayDate()
  const nameTrim = input.name.trim()
  const phoneDigits = normalizePhone(input.phone)

  let inner: TxInner
  try {
    inner = await prisma.$transaction(async (tx) => {
      let patient = await tx.patient.findUnique({
        where: { cpfNormalized: cpf },
      })

      if (!patient) {
        if (!nameTrim || !isValidBrMobileDigits(phoneDigits)) {
          return { kind: 'need_profile' as const }
        }
        try {
          patient = await tx.patient.create({
            data: {
              cpfNormalized: cpf,
              fullName: nameTrim,
              phoneNormalized: phoneDigits,
            },
          })
        } catch (e) {
          if (isUniqueViolation(e)) {
            patient = await tx.patient.findUniqueOrThrow({
              where: { cpfNormalized: cpf },
            })
          } else {
            throw e
          }
        }
      }

      const active = await tx.queueSession.findFirst({
        where: {
          patientId: patient.id,
          queueDate,
          status: { in: [QueueTicketStatus.WAITING, QueueTicketStatus.CALLED] },
        },
        include: { patient: true },
      })

      if (active) {
        return { kind: 'existing', active }
      }

      const agg = await tx.queueSession.aggregate({
        where: { queueDate },
        _max: { ticketNumber: true },
      })
      const next = (agg._max.ticketNumber ?? 0) + 1

      try {
        await tx.queueSession.create({
          data: {
            ticketNumber: next,
            patientId: patient.id,
            queueDate,
            status: QueueTicketStatus.WAITING,
          },
        })
        return { kind: 'new', ticketNumber: next }
      } catch (e) {
        if (isUniqueViolation(e)) {
          const active2 = await tx.queueSession.findFirst({
            where: {
              patientId: patient.id,
              queueDate,
              status: {
                in: [QueueTicketStatus.WAITING, QueueTicketStatus.CALLED],
              },
            },
            include: { patient: true },
          })
          if (active2) {
            return { kind: 'existing', active: active2 }
          }
        }
        throw e
      }
    })
  } catch {
    const state = await getQueueState()
    return {
      ok: false,
      error:
        'Não conseguimos enviar sua senha agora. Espere alguns instantes e tente de novo. Se repetir, fale na recepção.',
      state,
    }
  }

  const state = await getQueueState()

  if (inner.kind === 'need_profile') {
    return {
      ok: false,
      error:
        'Para primeira vez neste sistema, informe seu nome completo e um celular com DDD (10 números, ou 11 com o 9 antes do número).',
      state,
    }
  }

  if (inner.kind === 'existing') {
    return {
      ok: true,
      ticket: inner.active.ticketNumber,
      alreadyInQueue: true,
      peopleAhead: peopleAhead(
        inner.active.ticketNumber,
        state.currentTicket,
        inner.active.status
      ),
      state,
    }
  }

  return {
    ok: true,
    ticket: inner.ticketNumber,
    alreadyInQueue: false,
    peopleAhead: peopleAhead(
      inner.ticketNumber,
      state.currentTicket,
      QueueTicketStatus.WAITING
    ),
    state,
  }
}

export async function callNextTicket(
  guicheNumber: number
): Promise<
  | { ok: true; called: number; ticket_info: PublicTicketInfo; state: QueueStateJson }
  | { ok: false; error: string; state: QueueStateJson }
> {
  if (
    !Number.isInteger(guicheNumber) ||
    guicheNumber < 1 ||
    guicheNumber > 4
  ) {
    const state = await getQueueState()
    return {
      ok: false,
      error: 'Guichê inválido.',
      state,
    }
  }

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
          calledGuiche: guicheNumber,
        },
        include: { patient: true },
      })

      return updated
    })

    const state = await getQueueState()

    if (!result) {
      return {
        ok: false,
        error: 'Neste momento não há senhas aguardando para ser chamadas.',
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

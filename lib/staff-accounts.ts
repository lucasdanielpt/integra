import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const MASTER_DESK_SLOT = 0

/** Hash cost ( bcrypt ); equilíbrio entre segurança e uso em hospedagens pequenas. */
const BCRYPT_ROUNDS = 12

const PASSWORD_MIN = 8

export function validateNewStaffPassword(pw: string): string | null {
  if (!pw || pw.trim().length < PASSWORD_MIN) {
    return `A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`
  }
  return null
}

export async function hashStaffPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyStaffPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

function bootstrapMasterPasswordCandidates(): Set<string> {
  const set = new Set<string>()
  const a = process.env.ADMIN_MASTER_PASSWORD?.trim()
  const b = process.env.ADMIN_PASSWORD?.trim()
  if (a) set.add(a)
  if (b) set.add(b)
  if (process.env.NODE_ENV !== 'production') set.add('integra2024')
  return set
}

/**
 * Se já existe master no banco, valida o hash.
 * Se não existe, aceita somente valores da env (primeiro bootstrap) e grava hash no Postgres.
 */
export async function verifyMasterCredentialsOrBootstrap(
  password: string
): Promise<{ ok: boolean }> {
  const existing = await prisma.staffAccount.findUnique({
    where: { deskSlot: MASTER_DESK_SLOT },
  })

  if (existing) {
    const match = await verifyStaffPassword(password, existing.passwordHash)
    return { ok: match }
  }

  const candidates = bootstrapMasterPasswordCandidates()
  if (candidates.size === 0) {
    return { ok: false }
  }

  if (!candidates.has(password)) return { ok: false }

  const hash = await hashStaffPassword(password)
  await prisma.staffAccount.create({
    data: { deskSlot: MASTER_DESK_SLOT, passwordHash: hash },
  })

  return { ok: true }
}

export async function verifyGuicheCredentials(
  deskSlot: number,
  password: string
): Promise<boolean> {
  if (deskSlot < 1 || deskSlot > 4) return false
  const existing = await prisma.staffAccount.findUnique({ where: { deskSlot } })
  if (!existing) return false
  return verifyStaffPassword(password, existing.passwordHash)
}

export async function upsertStaffAccountPassword(params: {
  deskSlot: number
  plainPassword: string
}): Promise<void> {
  if (params.deskSlot < 0 || params.deskSlot > 4) {
    throw new Error('Desk inválido.')
  }

  const err = validateNewStaffPassword(params.plainPassword)
  if (err) throw new Error(err)

  const hash = await hashStaffPassword(params.plainPassword)
  await prisma.staffAccount.upsert({
    where: { deskSlot: params.deskSlot },
    update: { passwordHash: hash },
    create: { deskSlot: params.deskSlot, passwordHash: hash },
  })
}

export async function getStaffDeskStatus(): Promise<{
  masterConfigured: boolean
  guiches: { 1: boolean; 2: boolean; 3: boolean; 4: boolean }
}> {
  const rows = await prisma.staffAccount.findMany({ select: { deskSlot: true } })
  const s = new Set(rows.map((r) => r.deskSlot))

  return {
    masterConfigured: s.has(MASTER_DESK_SLOT),
    guiches: {
      1: s.has(1),
      2: s.has(2),
      3: s.has(3),
      4: s.has(4),
    },
  }
}

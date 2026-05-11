#!/usr/bin/env node
/**
 * Remove todos os dados operacionais: fila do dia e cadastro de pacientes.
 * Não altera migrações nem schema.
 *
 * Uso: pnpm run db:clean -- --yes
 * Requer DATABASE_URL (via .env, .env.local ou variável de ambiente).
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(process.cwd(), name)
    if (!existsSync(p)) continue
    const text = readFileSync(p, 'utf8')
    for (const line of text.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq <= 0) continue
      const k = t.slice(0, eq).trim()
      let v = t.slice(eq + 1).trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      if (!(k in process.env) || process.env[k] === '') {
        process.env[k] = v
      }
    }
  }
}

loadEnvFiles()

const confirmed =
  process.argv.includes('--yes') || process.argv.includes('-y')

if (!confirmed) {
  console.error(
    'Abortado: esta operação apaga todas as linhas de queue_sessions e patients.'
  )
  console.error('Execute: pnpm run db:clean -- --yes')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida. Configure .env ou exporte a variável.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  const sessions = await prisma.queueSession.deleteMany({})
  const patients = await prisma.patient.deleteMany({})
  console.log(
    `Limpeza concluída: ${sessions.count} sessão(ões) de fila, ${patients.count} paciente(s) removidos.`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

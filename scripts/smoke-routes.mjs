#!/usr/bin/env node
/**
 * Smoke mínimo: GET em / /totem /painel com SMOKE_BASE_URL (HTTPS em produção).
 * Uso: SMOKE_BASE_URL=https://seu-app.com pnpm run smoke:urls
 */

const raw = process.env.SMOKE_BASE_URL?.trim().replace(/\/$/, '')
if (!raw) {
  console.error('Defina SMOKE_BASE_URL, ex.: https://seu-projeto.vercel.app')
  process.exit(1)
}

if (!raw.startsWith('https://')) {
  console.warn('Aviso: em produção o smoke deve usar HTTPS (QR e totem esperam TLS válido).')
}

const paths = ['/', '/totem', '/painel']

async function main() {
  for (const p of paths) {
    const url = `${raw}${p}`
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        method: 'GET',
        headers: { Accept: 'text/html,*/*' },
      })
      if (!res.ok) {
        console.error(`FAIL ${url} → HTTP ${res.status}`)
        process.exit(1)
      }
      console.log(`OK ${url} → ${res.status}`)
    } catch (e) {
      console.error(`FAIL ${url}`, e instanceof Error ? e.message : e)
      process.exit(1)
    }
  }
  console.log('Smoke HTTP concluído com sucesso.')
}

main()

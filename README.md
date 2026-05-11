# integra

Implementação do sistema de fila para a clinica médica íntegra.

## Banco de dados (`DATABASE_URL`)

1. Copie [.env.example](.env.example) para `.env` no desenvolvimento.
2. Suba o Postgres local: `docker compose up -d` (uso mapeado em `localhost:5435`).
3. Aplique migrações uma vez ou após puxar alterações em `prisma/migrations`:
   `pnpm exec prisma migrate deploy`.

O comando de **build de produção** (`pnpm run build`) executa **`prisma migrate deploy`**, **`prisma generate`** e **`next build`**. Se precisar compilar sem banco disponível localmente (só cliente Prisma/HTML), use `pnpm run build:local`.

## Deploy (ex.: Vercel)

Configure a variável de ambiente **`DATABASE_URL`** nos ambientes **Production** e **Preview** com a mesma URL de conexão que o servidor de build usará contra o Postgres (acesso público liberado ao IP da plataforma ou URL com pool SSL). O primeiro deploy já aplica as migrações pendentes no build.

**Não use** `localhost` ou `127.0.0.1` na Vercel: o build roda nos servidores da plataforma; a URL precisa ser a do Postgres **na nuvem** (Neon, Supabase, etc.), igual à que você usaria no notebook apontando para produção. Se o log mostrar `localhost:5435`, a `DATABASE_URL` no painel da Vercel ainda está errada ou ausente (o deploy não lê o `.env` do seu PC).

O aviso **Ignored build scripts** do pnpm some se o `package.json` listar `pnpm.onlyBuiltDependencies` (já incluído neste repositório para Prisma e Sharp) ou após `pnpm approve-builds` localmente e commit do lockfile resultante.

## Smoke test (Fase 2)

Checklist manual (tablet fullscreen, QR em HTTPS estável): [docs/smoke-test-fila-mvp.md](docs/smoke-test-fila-mvp.md). Opcional contra produção já publicada:

`SMOKE_BASE_URL=https://seu-app.vercel.app pnpm run smoke:urls`.

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

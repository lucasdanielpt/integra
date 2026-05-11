# Banco de dados em operação padrão (produção)

Este documento resume o que deve estar definido e o que costuma ser ajustado quando o projeto deixa o ambiente de desenvolvimento e passa a rodar de forma contínua em produção (ex.: app na Vercel + PostgreSQL na AWS ou outro provedor).

---

## 1. O que **não** muda no código

- O **Prisma** (`prisma/schema.prisma`, `prisma/migrations/`) e a **lógica** em `lib/queue-service.ts` permanecem os mesmos.
- A aplicação **sempre** lê a conexão pela variável de ambiente **`DATABASE_URL`**. Quem muda é o **valor** dessa variável em cada ambiente, não o código-fonte.

---

## 2. O que **deve** ser configurado em produção

### 2.1 `DATABASE_URL` na Vercel (ou outro host)

1. No painel do projeto → **Settings** → **Environment Variables**.
2. Crie **`DATABASE_URL`** para **Production** (e, se usar, **Preview**).
3. O valor deve ser a **URL completa** do Postgres **na nuvem**, nunca `localhost`:

   ```text
   postgresql://USUARIO:SENHA@HOST:5432/NOME_DO_BANCO?schema=public&sslmode=require
   ```

4. Garanta que a variável esteja disponível no **build** (comportamento padrão na Vercel inclui builds). O comando `pnpm run build` executa **`prisma migrate deploy`**, que precisa **alcançar o banco durante o deploy**.

### 2.2 Conectividade do banco com a internet

Se o Postgres estiver na **AWS RDS** em modo inicial “privado”, o deploy na Vercel **não alcança** o banco até:

- **`Public access` da instância** adequado ao seu desenho (muitos MVPs usam RDS **publicly accessible** + **security group** refinado depois); ou  
- uma arquitetura **privada** (VPC, tunnels, bastion etc.), mais trabalhosa.

Sem rota rede até o host na porta **5432**, aparece erro **P1001** no build ou em runtime.

### 2.3 Security Group (AWS) ou firewall equivalente

- Regra **inbound**: **PostgreSQL (5432)** a partir das origens que realmente devem conectar (em testes pode ser temporariamente `0.0.0.0/0`; endurecer depois conforme política).
- Manter senha forte e **rotacionar** após exposição acidental ou troca de pessoal.

### 2.4 SSL (`sslmode=require`)

Para RDS e a maioria dos provedores gerenciados, mantenha na URL **`sslmode=require`**.

---

## 3. Fluxo esperado em cada deploy

1. **`pnpm install`** (na Vercel, com lockfile consistente).
2. **`pnpm run build`** → `prisma migrate deploy` aplica migrações pendentes → `prisma generate` → `next build`.
3. O app em runtime usa o **mesmo** `DATABASE_URL` para ler/gravar dados.

Ou seja: **nenhum passo manual de SQL** é obrigatório se as migrations estiverem no repositório e o `DATABASE_URL` apontar para o banco certo.

Para **compilar sem falar com o banco** (restrito a fluxos locais/CI específicos), existe o script **`build:local`** no `package.json`; **produção** deve usar o **`build`** completo.

---

## 4. Ambientes separados (recomendado)

| Ambiente        | Onde costuma viver o Postgres    | `DATABASE_URL` na Vercel      |
|----------------|-----------------------------------|-------------------------------|
| Desenvolvimento | Docker local (`docker-compose`)  | `.env` local (não commitar)   |
| Preview        | Instância ou DB **só de teste**  | Variável **Preview** distinta |
| Production     | RDS / instância **oficial**       | Variável **Production**       |

Evite usar o **mesmo** banco de produção em **Preview**, para não misturar dados de teste com operação real.

---

## 5. Boas práticas após “go-live”

- **Backups automáticos** no RDS (retenção conforme política da clínica).
- **Monitoramento** de CPU, conexões e espaço em disco.
- **Rotação de senha** master periodicamente; armazenar só em variáveis secretas (Vercel / AWS Secrets Manager), nunca no Git.
- **`.env` e `.env*.local`** ignorados no Git; apenas **`.env.example`** no repositório, sem segredos.
- Aviso **Ignored build scripts** do pnpm: o `package.json` pode declarar `pnpm.onlyBuiltDependencies` para Prisma e Sharp (quando presente no repositório).

---

## 6. Fuso e “dia da fila”

A lógica da fila usa o **dia civil em `America/Sao_Paulo`** para `queue_date` (`lib/queue-date.ts`). Isso **não** exige alteração no RDS; alinhe com a clínica se a “virada” do dia da fila deve seguir outro critério no futuro.

---

## 7. Checklist rápido antes de considerar “operação padrão”

- [ ] `DATABASE_URL` na Vercel **Production** aponta para o Postgres **de produção** (URL com host real, `sslmode=require`).
- [ ] Preview, se existir, tem **outro** banco ou política clara de dados.
- [ ] RDS (ou equivalente) **Available**, rede e **security group** permitem conexão na porta 5432 conforme o desenho escolhido.
- [ ] Deploy conclui **sem P1001** e sem falha em `prisma migrate deploy`.
- [ ] Segredos **não** estão no Git; **rotação** feita se houve vazamento.
- [ ] Backups e plano mínimo de recuperação definidos com o responsável técnico.

---

## 8. Referências no repositório

- Exemplo de URL local: `.env.example`
- Schema e migrations: `prisma/`
- Serviço da fila: `lib/queue-service.ts`
- Deploy e variáveis: `README.md` (seção de banco e Vercel)

Para detalhes de connection string específicos do provedor, use a documentação **AWS RDS (PostgreSQL)** ou equivalente.

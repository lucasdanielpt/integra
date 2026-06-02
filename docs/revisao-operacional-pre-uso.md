# Revisão operacional — uso iminente da fila (pré‑go-live)

Documento objetivo para quem já está a **executar o sistema na véspera** de uso em campo. Sintetiza estado do projeto, pontos confortáveis e **prioridades antes de operar com pacientes reais**.

---

## 1. Resumo executivo

| Aspecto | Situação |
|--------|-----------|
| **Fila operacional em Postgres** (emitir senha, chamar próximo, zerar dia, TV, totem/mobile) | Alinhado com o MVP documentado (`MVP.md` Fases 1 e 2 marcadas como atendidas). |
| **Contas coordenação + guichês** | Senhas em `staff_accounts` (hash bcrypt); coordenação cadastra os 4 guichês na UI `/admin`; bootstrap inicial do master ainda disponível por variável de ambiente. |
| **“Pronto para amanhã”** | **Sim, desde que** o checklist da secção [4](#4-checklist-obrigatório-antes-da-manhã-seguinte) seja cumprido (BD, migrações, segredos, contas criadas e **smoke físico rápido**). |
| **Riscos a ter em mente** | `GET /api/queue` expõe estado agregado da fila sem autenticação (secção [5.1](#51-leitura-agregada-em-get-apiqueue)); sem rate‑limit (secção [5.3](#53-força-bruta-nas-rotas-de-auth-e-uso-da-api)). |

Este repositório **não garante**, por si só, backup de RDS ou monitorização 24×7 — isso depende da infra onde o Postgres está a correr ([`docs/operacao-banco-dados-producao.md`](./operacao-banco-dados-producao.md)).

---

## 2. O projeto está “completamente” pronto?

Para um **MVP de fila ambulatorial** com totem/mobile, TV e operações de admin/guichê conforme já implementado:

- Em termos **de código e fluxo**, o escopo atual está **implementado** e o CI simula builds de produção com Postges + `pnpm run build` (inclui `prisma migrate deploy`).
- “Completamente pronto” no sentido forte (auditoria de segurança, hardening contra abuso massivo na API, TTL automático de dados, relatórios, etc.) **não**: é um MVP conscientemente enxuto; os principais pontos estão nas secções [5](#5-pontos-que-exigem-atenção-ou-decisão) e [7](#7-melhorias-futuras-sugeridas-sem-bloquear-o-operacional-de-amanhã).

---

## 3. O que está bem coberto (confiança)

- **Um ticket ativo por CPF por dia**: regra centrada na base (`lib/queue-service.ts`), evita fila duplicada na mesma jornada operacional definida pelo fuso `America/Sao_Paulo` ([`docs/operacao-banco-dados-producao.md`](./operacao-banco-dados-producao.md)).
- **Papéis em API**: apenas perfil **guichê** chama `POST /api/queue` `action:call`; apenas **coordenação (master)** zera (`action:reset`); totem/mobile não precisam desses segredos.
- **Painel/TV**: mostra nome, guichê da senha atual e até **três próximas senhas** com nomes (útil para expectativa visual).
- **Admin**: lista da fila com nomes por posição + gestão de senhas nos guichês.
- **Boas práticas de logs** em erros nas rotas (evitar despachar corpo JSON com **CPF**/telefone para `console`; ver [`docs/lgpd-dados-logs-retencao.md`](./lgpd-dados-logs-retencao.md)).
- **Documentação já existente** para BD, LGPD conceitual, smoke em HTTPS estável (`docs/smoke-test-fila-mvp.md`).

---

## 4. Checklist obrigatório antes da manhã seguinte

Use como **lista mínima** quando se disser que “amanhã vamos usar de verdade”.

### Infraestrutura e dados

1.(CONCLUÍDO) **`DATABASE_URL` de produção** correta no host do Next (sem `localhost` no deploy remoto).
2. (CONCLUÍDO)**Deploy / build bem-sucedido** com migrações aplicadas (`prisma migrate deploy` no ciclo normal de `pnpm run build`; ver [`README.md`](../README.md)).
3. **Backups automáticos** do Postgres configurados onde o banco está (RDS Neon, etc.), com alguém a saber **como restaurar** em cenário degradado (`docs/operacao-banco-dados-producao.md` checklist).

### Contas e segurança operacional

4.(CONCLUÍDO) **`ADMIN_MASTER_PASSWORD`** (ou `ADMIN_PASSWORD`) **definida em produção** **se** for o **primeiro** arranque e ainda **não** existir linha `desk_slot = 0` na tabela `staff_accounts`; após primeiro login bem-sucedido, o fluxo habitual passa só pelo hash no banco (`lib/staff-accounts.ts`).
5. (CONCLUÍDO) Após entrada como **coordenação** em **`/admin`**: em **«Contas da recepção»**, definir **senhas robustas** (≥ 8 caracteres) para os **Guichês 1–4** que forem **efetivamente** usados na clínica; sem isso os operadores **não** podem iniciar sessão nem chamar números.
6. Opcional recomendável: remover ou **rodar periodicamente rotação** das variáveis de bootstrap (`ADMIN_MASTER_PASSWORD` / etc.) depois que tudo estiver apenas no Postgres (reduz exposição accidental em painéis da hospedagem).

### Verificação prática rápida (15–25 min combinados)

7. Smoke **HTTPS** estável conforme lista em [`docs/smoke-test-fila-mvp.md`](./smoke-test-fila-mvp.md) (**totem fullscreen**, **`/`** pelo QR esperado para produção **`/painel`**, **`/admin`** apenas em rede restrita onde fizer sentido).
8. Um **paciente fictício**: retirada de senha no totem/mobile → ver número no painel/admin → chamada pelo **login de um guichê** → paciente aparece na TV com nome e **Guichê** → **coordenação** pode **zerar fila** ao fim do ensaio se quiser repetir cenário limpo no mesmo dia apenas em homologação.
9. (CONCLUÍDO) Confirmar URL do **QR** impresso apontando para **`/`** HTTPS final (sem substituí-lo por previews temporários mudáveis a cada merge).

Opcional rápido: `SMOKE_BASE_URL=https://seu-host pnpm run smoke:urls` (só garante GET em páginas; **não** substitui o teste acima nem `/admin`/API).

---

## 5. Pontos que exigem atenção ou decisão

### 5.1 Leitura agregada em `GET /api/queue`

O `GET /api/queue` é **sem autenticação** (para o painel da TV, celular e outros clientes). A resposta inclui o estado útil ao painel (**nomes**, próximas senhas, e em blocos agregados também **CPF** / **telefone** onde o modelo expõe para operação).

- **Impacto LGPD/prática**: qualquer pessoa ou script que invoque esse endpoint no mesmo host **vê a fila do dia atual**, não só o que aparece na tela da TV.
- **Mitigações operativas**: rede interna onde possível; não divulgar o hostname publicamente; **nunca** colocar CPF na URL (`docs/lgpd-dados-logs-retencao.md`).

Pontos LGPD relacionados continuam descritos em `docs/lgpd-dados-logs-retencao.md`.

### 5.2 Painel físico como canal de comunicação ao paciente

Mostrar até **quatro pacientes nominalmente reconhecíveis** (senha atual + três seguintes na fila na TV) pode ser **ótimo para a operação**; é também **elevada visibilidade** de dados pessoais em espaço público na clínica.

- Alinhar com a clínica se a posição da TV e o público esperado são **aceitáveis** no contexto habitual de chamada por nome.

### 5.3 Força bruta nas rotas de auth e uso da API

**Não** há throttle/rate-limit implementado nos handlers de **`/api/auth`** ou **`/api/queue`**.

- Um atacante com acesso repetido poderia tentar forças senhas (mitigável em termos de hospedagem: WAF, Vercel Pro, nginx, firewall). Para o dia-a-dia de uma MVP interna este risco costuma aceitar‑se conscientemente até haver política própria.

### 5.4 Sessão admin

Cookies **httpOnly** e **sameSite strict** onde definidos ([`lib/server-admin-auth.ts`](../lib/server-admin-auth.ts)): adequado contra XSS simple no mesmo site; falta MFA e revogação lado servidor (token opaco apenas em cookie aleatório, sem blacklist em BD).

### 5.5 Prisma Studio e consola de base

Correr **`prisma studio`** (porta tipo 5557) **só exposto em máquinas de confiança**; não o publique nem deixe a porta aberta contra a Internet inteira durante o próprio dia útil paciente‑alvo.

---

## 6. Se algo falhar manhã cedo (“contingência rápida”)

| Sintoma provável | O que conferir primeiro |
|------------------|-------------------------|
| Deploy ou build falha com **P1001** / erro de prisma | **`DATABASE_URL`**, firewall/SG porta **5432**, **sslmode=require** ([`docs/operacao-banco-dados-producao.md`](./operacao-banco-dados-producao.md)). |
| Ninguém **entra** na coordenação | Master em `staff_accounts` vs bootstrap **env** falta primeiro login; erro de typo na password. |
| Guichês **403** ao chamar senha | Sessão **não** é de modo guichê correto OU senha não foi persistida nos guichês **1–4** via admin. |
| Painel não atualiza ou mostra sempre vazio | Hora servidor vs `America/Sao_Paulo`; se “outro dia” operacional já virou pode não haver `queue_sessions` para hoje até primeira emissão; em TVs antigas o JavaScript pode falhar (ver discussão de browser da LG). |
| Dados estranhos / fila perdida inadvertidamente | Só coordenação possui reset; revisar auditoria ou backup se necessário antes de grandes limpezas (`db:clean` só em dev controlado por script). |

---

## 7. Melhorias futuras sugeridas (sem bloquear o operacional de amanhã)

- Endpoint ou campos **subset** para só o painel público consumir (**nome só** ou inicial + sobrenomes abreviados) enquanto admin mantêm visão integral.
- **Rate limiting** / proteção brute-force sobre `POST /api/auth`.
- **TTL** ou política automatizada para arquivamento de sessões histórico (`docs/lgpd-dados-logs-retencao.md` já sugere política declarada pela clínica).
- Extend smoke CI para **`/painel`** e eventual health read-only já existente; mencionar **`/admin`** só se houver cenário público especial.

---

## 8. Documentos de referência no repositório

| Doc | Para quê |
|-----|-----------|
| [`MVP.md`](../MVP.md) | Escopo pretendido pelas duas fases e critérios de aceite já descritos lá. |
| [`docs/smoke-test-fila-mvp.md`](./smoke-test-fila-mvp.md) | Checklist física obrigada antes de declarar uso “cerrado”. |
| [`docs/operacao-banco-dados-producao.md`](./operacao-banco-dados-producao.md) | Deploy, RDS, SSL, previews vs produção. |
| [`docs/lgpd-dados-logs-retencao.md`](./lgpd-dados-logs-retencao.md) | Dados tratados, logs evitados, retenção em linguagem institucional. |
| [`README.md`](../README.md) | Comandos mínimos e smoke URL opcional. |
| `.github/workflows/ci.yml` | Pipeline de confiança: `pnpm run build` com Postgres CI. |

---

**Nota sobre atualização:** texto alinhado ao código do repositório no momento dessa revisão; após merges relevantes, revalidar migrações, variáveis e smoke.

**Responsável operacional deve assinar/check** a checklist da secção 4 antes de abrir porta à fila paciente-real.

## Fase 1 — “Fila fiel ao que já existe” (backend + uso diário na clínica)

**Meta:** Trocar a memória por Postgres e manter o fluxo atual (retirar senha, admin chama próximo, painel mostra atual/próximo) funcionando ponta a ponta.

### Incluir

- [x] **DATABASE_URL** em todos os ambientes; **migrate deploy** no CI/deploy.  
- [x] **API na base Prisma:**
  - Entrada na fila: CPF (+ nome obrigatório só se paciente novo), normalizar CPF, upsert paciente.
  - Regra MVP: **um ticket ativo** (`WAITING` ou `CALLED`) por paciente por `queue_date`; se já existir, devolver esse ticket + `peopleAhead`, sem nova senha.
  - **call** e **reset** persistidos (mesma semântica do painel/admin: senha atual / última senha emitida no dia).
- [x] **Substituir** `lib/queue-store.ts` nas rotas atuais — removido; lógica em `lib/queue-service.ts` + `app/api/queue/route.ts`.
- [x] **Cliente na home (`/`):** mesmo formulário/interação atual, exibindo “já está na fila” + posição quando o CPF já tiver sessão ativa (`alreadyInQueue`, `peopleAhead`), botão para atualizar e polling leve.

**Critério de pronto:** clínica consegue operar só com Postgres (totem físico poderia até abrir `/` nesta fase, sem UX dedicada).

---

## Fase 2 — “Experiência que o cliente pediu” + acabamento

**Meta:** Separar canais e polir segurança/UX para produção real.

### Incluir

- [ ] **Tablet/kiosk** (`/totem` ou parecido): UI grande, sem links de admin; confirma → mostra número ~5 s → volta ao início (CPF primeiro, nome só se primeiro acesso ou correção opcional documentada).
- [ ] **Celular (QR para `/`):** fluxo explícito CPF primeiro; lookup pré-preenche nome; foco em acompanhar quando já há ticket (polling leve ao estado da fila do dia).
- [ ] **Validações e mensagens claras:** CPF (formato/checksum se quiser), erros amigáveis, loading.
- [ ] **Revisão rápida LGPD/log:** não logar CPF completo onde não precisar; política simples de retenção (mesmo que “apenas documentado” no MVP).
- [ ] **Smoke test:** tablet em fullscreen; QR apontando para URL estável HTTPS.

**Critério de pronto:** duas superfícies (totem vs celular) com comportamentos distintos e regra “CPF já na fila = progresso, não nova senha” consistente nos dois.

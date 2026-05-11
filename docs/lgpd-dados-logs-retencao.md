# LGPD — dados tratados, logs e retenção (MVP Clínica Íntegra / fila)

Este documento cumpre a revisão mínima da Fase 2 do MVP (política **documentada**, sem automação obrigatória de exclusão em código).

---

## 1. Dados pessoais envolvidos

| Dado | Onde aparece | Finalidade típica (MVP) |
|------|----------------|-------------------------|
| CPF normalizado (`cpf_normalized`) | Tabela `patients` | Identificar se a mesma pessoa já retirou senha no dia; evitar fila duplicada; cadastro rápido. |
| Nome completo (`full_name`) | `patients` | Exibir no painel/admin e personalizar atendimento. |
| Celular (`phone_normalized`) | `patients` | Contato; cadastro na primeira retirada de senha. |
| Relação paciente–senha–dia | `queue_sessions` | Operação da fila (ordem, status, ticket). |

Não há, neste repositório, envio desses dados a terceiros de marketing; o fluxo é operacional (fila + painel).

---

## 2. Logs e CPF / telefone

**Regra:** não registrar CPF completo, telefone completo nem JSON de corpo de requisição contendo esses campos em `console.log` / prints de depuração.

- A rota `POST /api/queue` trata o corpo internamente e, em erro inesperado, registra apenas **mensagem de erro** e a **ação** (`check`, `generate`, etc.), nunca os campos enviados pelo paciente.
- Funções auxiliares em `lib/safe-log.ts` produzem **rótulos agregados** (ex.: `cpf_11_digitos_validado_servidor`) se no futuro forem ligadas a telemetry — **sem dígitos reais**.
- **Prisma:** em desenvolvimento, evite habilitar `log: ['query']` com parâmetros se isso gravaria valores de linha completas nos logs da IDE/terminal — risco desnecessário de vazamento em ambientes que encaminham stdout.

---

## 3. Retenção dos dados no banco (política simples)

- Os registros permanecem enquanto a clínica **precisar** da base para operação ou histórico operacional simples (MVP).
- **Senhas (`queue_sessions`)** podem ter política própria: arquivamento ou exclusão periódica de linhas mais antigas que um limite combinado pelo **controlador dos dados** (ex.: apenas sessões do dia atual, ou retenção de X meses se houver obrigação interna ou regulatória). **Este repositório não implementa TTL automático.**
- **Pacientes (`patients`):** atualização quando a pessoa retorna; exclusão/anonymização apenas se o controlador assim definir (processo fora deste código, ou script administrativo sob controle).

Documente internamente qual prazo faz sentido para a clínica e quem pode solicitar exclusão pelo direito das pessoas titulares (LGPD).

---

## 4. Hospedeiro (ex.: Vercel)

Plataformas mantêm logs de infraestrutura e edge por um tempo próprio da **política do provedor**; revise no painel do host o que aparece sobre URLs invocadas (sem garantir ausência total de dados em query strings — **esta app não deve colocar CPF na URL**).

---

## 5. Referências no código

- Mascaramento simbólico para logs: `lib/safe-log.ts`
- Tratamento da fila: `lib/queue-service.ts`, `app/api/queue/route.ts`
- Cliente: não persiste CPF em `localStorage` neste MVP; estado só em memória da página.

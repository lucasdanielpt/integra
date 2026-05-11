# Smoke test — Fase 2 (totem × celular, HTTPS estável)

Checklist antes de considerar **a Fase 2 fechada** em produção ou homologação. Parte das verificações é **manual** (tablet físico, QR impresso).

---

## 1. URLs que devem existir em produção

| Uso | Caminho esperado |
|-----|-------------------|
| **Celular (QR na recepção)** | raiz **`/`** → fluxo mobile (CPF primeiro, acompanhar fila). |
| **Tablet / kiosk** | **`/totem`** → texto grande, sem links de admin na tela principal, volta sozinho ao CPF ~5 s após mostrar a senha. |
| Operação TV / recepção | **`/painel`** |
| Operação restrita | **`/admin`** |

Todas atendidas em **HTTPS** com certificado válido (sem aviso “não seguro” no navegador).

**URL estável:** use o domínio de produção final (ex.: Vercel com domínio customizado ou projeto `*.vercel.app` **fixo para o paciente**) no material impresso/digital do QR. Evite Preview deploys que mudam URL a cada branch, salvo uso explícito de homologação.

Variável opcional para lembrar a base em scripts e comunicação:

- `NEXT_PUBLIC_APP_URL=https://seudominio.com.br` — documentado em `.env.example`; útil só como referência (o app não obriga esse nome).

---

## 2. Smoke HTTP automatizado (opcional)

Confere se os caminhos principais respondem (não substitui o teste físico):

```bash
export SMOKE_BASE_URL=https://seudominio.com.br
pnpm run smoke:urls
```

Exige `SMOKE_BASE_URL` com **HTTPS** em produção. Falha se alguma rota retornar erro HTTP.

---

## 3. Tablet em fullscreen (/totem)

1. Abra **`https://<sua-base>/totem`** no navegador do tablet.
2. Coloque em **fullscreen** ou modo quiosque conforme o dispositivo:
   - Safari (iPad): **Guia de Acesso** ou atalho de tela cheia onde disponível.
   - Chrome/Android: modo apresentação / kiosk do fabricante, ou navegador em tela cheia na barra.
3. **Fluxo rápido:** informe um CPF de teste válido (11 dígitos com dígitos verificadores válidos).
4. Paciente já cadastrado: confirme que **nome/celular** aparecem e **Retirar senha** emite número.
5. Paciente novo: nome + celular, emite número.
6. Após nova senha, confirme **contagem regressiva ~5 s** e **retorno automático** à tela de CPF sozinho (sem ficar permanentemente na senha).
7. Com o **mesmo CPF**, repita Consulta novamente:** deve aparecer que **já está na fila** com o **mesmo ticket**, sem segunda senha.
8. Confirme **ausência de links grandes** para admin/painel no fluxo do totem (conforme Fase 2).

---

## 4. Celular via QR (/)

1. Gere/imprima QR apontando exatamente para **`https://<sua-base>/`** (final **sem** `/totem`).
2. Com um celular, escaneie o QR e aceite ir ao site (**HTTPS**).
3. Fluxo equivalente ao totem em termos de regra:
   - CPF primeiro → consulta ou cadastro.
   - Mesmo paciente já em fila: **mostra mesmo ticket**, sem emitir segunda senha.
4. Confirme bloco da **TV** atualizando (celular): “Fila na TV neste momento” / polling leve quando há ticket.
5. Link **Abrir painel da sala** leva ao painel público esperado.

---

## 5. Consistência “CPF já na fila”

Rodar nos **dois dispositivos** (ou dois navegadores) com **o mesmo dia de fila** no banco:

1. Retira senha com CPF **A** no totem ou no celular.
2. Consulta mesmo CPF **A** na **outra** superfície: deve apenas **acompanhar** (sem nova senha).

---

## 6. Registrar resultado

|Pergunta | OK? |
|---------|-----|
| `/` e `/totem` só em HTTPS em produção? | ☐ |
| QR aponta para `/` estável (não link quebrável)? | ☐ |
| Totem fullscreen + retorno ao CPF após senha? | ☐ |
| Regra de ticket único por CPF/dia válida nos dois? | ☐ |

Data e responsável: _______________

# Senha do painel na Vercel

O caminho **`/painel`** exige uma senha antes de mostrar nomes e a fila completa. Totem e celular (**`/`**, **`/totem`**) **não** usam essa senha.

---

## 1. Criar a variável na Vercel

1. Abra o projeto na [Vercel](https://vercel.com) → **Settings** → **Environment Variables**.
2. Adicione:
   - **Name:** `PAINEL_DISPLAY_PASSWORD`
   - **Value:** a senha que a recepção vai digitar na TV (ex.: uma frase longa ou PIN forte; **mínimo recomendado: 8+ caracteres**).
   - **Environment:** marque **Production** (e **Preview** se quiser o mesmo comportamento em homologação).
3. Salve e faça um **Redeploy** do último deploy de Production (Deployments → ⋯ → Redeploy), para o servidor carregar a variável nova.

Não commite essa senha no Git. Só na Vercel (e opcionalmente no `.env` local, que já está no `.gitignore`).

---

## 2. Uso na TV

1. Abra **`https://seu-dominio/painel`** no navegador da televisão.
2. Na tela de login, digite a **mesma** senha definida em `PAINEL_DISPLAY_PASSWORD`.
3. O painel passa a atualizar com nomes, guichê e próximas senhas.
4. **Sair** remove a sessão neste navegador (botão no canto superior direito).

---

## 3. Desenvolvimento local

No `.env` (cópia de `.env.example`):

```env
PAINEL_DISPLAY_PASSWORD="minha-senha-local"
```

Se **não** definir em desenvolvimento, o código usa o fallback interno `integrapainel-dev-only` (apenas fora de produção).

Suba o app: `pnpm run dev` → http://localhost:3000/painel

---

## 4. O que a senha protege

- A **página** `/painel` só mostra a fila completa após login.
- A API **`GET /api/queue`** devolve dados completos (nomes, lista) **somente** com cookie de sessão do painel ou login de **admin/guichê**.
- Pacientes no celular continuam vendo só resumo numérico da TV, sem lista de nomes de terceiros.

---

## 5. Problemas comuns

| Sintoma | O que fazer |
|--------|-------------|
| Mensagem “Painel não configurado” | `PAINEL_DISPLAY_PASSWORD` ausente na Vercel → criar variável e **redeploy**. |
| Senha correta mas não entra | Redeploy após alterar a variável; limpar cookies do site na TV e tentar de novo. |
| Painel sem nomes após entrar | Cookie bloqueado no navegador da TV → testar em Chrome/Firestick; em LG antiga o cookie pode falhar. |

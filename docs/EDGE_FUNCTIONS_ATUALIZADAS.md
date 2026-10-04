# Edge Functions Mercado Pago — Códigos completos atualizados

Arquivos no repositório (branch `main`, commit `089c233f`):

- `supabase/functions/create-checkout-payment/index.ts`
- `supabase/functions/confirm-checkout-payment/index.ts`
- `supabase/functions/mercadopago-webhook/index.ts`

## Como aplicar pela interface do Supabase (sem terminal)

1. Abra **Code Edge → Functions** no dashboard do Supabase.
2. Para cada uma das 3 funções acima: clique na função → aba **Edit/Editor** → apague TODO o conteúdo de `index.ts` → cole o conteúdo do arquivo correspondente deste repositório → clique **Deploy / Update**.
3. Confira em **Secrets** que existem:
   - `MERCADOPAGO_ACCESS_TOKEN` = token de teste `TEST-...`
   - `SERVICE_ROLE_KEY` = chave service_role (Settings → API)
   - `PROJECT_URL` = `https://pfrxuxiohxwhtcxvjnbd.supabase.co`
   - `ANON_KEY` = chave anon/public
4. Teste em aba anônima: inscreva-se → PIX/Cartão → deve abrir o Checkout Pro do MP.

## Correções incluídas nestes códigos

- **CORS completo**: preflight responde com `Access-Control-Allow-Origin` dinâmico, `Allow-Methods`, `Max-Age: 86400` e `Allow-Headers` incluindo `x-app-url`, `x-supabase-api-version`, `x-supabase-access-token`, `x-canonical-url`, `x-session-id` (todos os headers que o SDK Supabase envia — causa raiz do "Failed to fetch").
- **Nomes de secrets à prova de erro**: aceita `PROJECT_URL` ou `SUPABASE_URL`, `ANON_KEY` ou `SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`.
- **Funciona sem login** (aba anônima): fallback automático para service role nas 3 funções.
- **Confirmação automática em 3 camadas**: webhook + confirmação no retorno (`?status=approved`) + idempotência (não confirma duas vezes).

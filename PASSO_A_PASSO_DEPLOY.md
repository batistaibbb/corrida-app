# 📋 Passo a Passo — Deploy das Melhorias + Integração Mercado Pago

Este guia organiza **toda** a sequência de ações necessárias, da entrega do código no GitHub até o checkout Mercado Pago funcionando com atualização automática de status.

---

## ETAPA 1 — Publicar o código no GitHub

As melhorias já estão commitadas na branch local `qwen-code-8888e616-4335-431f-ab62-926215ffc8ee` (7 commits à frente de `main`, incluindo comprovante em PDF, relatório de inscrições com participante/kit/filtros e a integração Mercado Pago).

### Opção A — Abrir Pull Request pela interface (recomendado)
1. Abra o repositório no GitHub.
2. Vá em **"Pull requests" → "New pull request"** (ou clique no banner *"Compare & pull request"* que aparece para branches recentes).
3. Selecione: base = `main` ← compare = `qwen-code-8888e616-4335-431f-ab62-926215ffc8ee`.
4. Crie o PR e faça o **merge**.

### Opção B — Push direto via terminal (se você tiver acesso de escrita)
```bash
git push origin qwen-code-8888e616-4335-431f-ab62-926215ffc8ee
git checkout main && git merge qwen-code-8888e616-4335-431f-ab62-926215ffc8ee
git push origin main
```

> ⚠️ **Observação:** os commits incluem arquivos de `node_modules/` e `dist/` porque o `.gitignore` deste repositório está vazio (herdado do snapshot inicial). Isso não quebra nada, apenas deixa o histórico maior. Se quiser limpar depois, é só criar um `.gitignore` com `node_modules/` e `dist/` e rodar `git rm -r --cached node_modules dist`.

Após o merge na `main`, o **Vercel publica automaticamente** (se estiver conectado à branch `main`). Confirme o deploy em *Vercel → Deployments*.

---

## ETAPA 2 — Banco de dados (Supabase → SQL Editor)

Execute **nesta ordem**, cada arquivo inteiro (colado no SQL Editor → Run):

| # | Arquivo | O que faz | Obrigatório? |
|---|---------|-----------|--------------|
| 1 | `ADD_PRICE_TO_REGISTRATIONS.sql` | Cria colunas `price`, `kit_id`, `kit_name` em `registrations`; zera preços nulos; traz queries de diagnóstico dos kits sem preço | ✅ Sim |
| 2 | `ADD_PARTICIPANT_TO_REGISTRATIONS.sql` | Cria colunas `participant_first_name`, `participant_last_name`, `participant_email`, `participant_phone`, `participant_cpf`; tenta popular inscrições antigas via `profiles` | ✅ Sim (novo relatório) |
| 3 | `MERCADOPAGO_CHECKOUT_SETUP.sql` | Cria colunas `mercadopago_preapproval_id`, `mercadopago_status_detail`, `last_checkout_event` em `registrations` | ✅ Sim (Mercado Pago) |

Todos usam `IF NOT EXISTS` — são **seguros para re-executar**.

💡 Depois do passo 1, rode o **diagnóstico de kits** do arquivo: se algum kit aparecer sem preço válido, corrija no painel admin (o preço do kit precisa ser um número > 0).

---

## ETAPA 3 — Credenciais do Mercado Pago

1. Acesse [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) → crie uma aplicação.
2. Em **"Credenciais de teste"** copie o **Access Token** (começa com `TEST-`). Para produção, gere as credenciais de produção quando tudo estiver validado.
3. No **Supabase → Project Settings → API Keys (Edge Functions / Secrets)**, adicione:
   - Nome: `MERCADOPAGO_ACCESS_TOKEN`
   - Valor: o token copiado

---

## ETAPA 4 — Deploy das Edge Functions (Supabase CLI)

Instale a CLI ([docs](https://supabase.com/docs/guides/cli)) e implante as 3 functions:

```bash
npx supabase login
npx supabase link --project-ref pfrxuxiohxwhtcxvjnbd

npx supabase functions deploy create-checkout-payment --no-verify-jwt
npx supabase functions deploy confirm-checkout-payment --no-verify-jwt
npx supabase functions deploy mercadopago-webhook --no-verify-jwt
```

> `--no-verify-jwt` é necessário porque o app chama essas functions sem JWT do Supabase.

Confira em **Supabase → Edge Functions** que as três aparecem como *Active*.

---

## ETAPA 5 — Webhook do Mercado Pago

1. No painel de developers do MP → sua aplicação → **"Webhooks"** → **Adicionar webhook**.
2. URL: `https://pfrxuxiohxwhtcxvjnbd.supabase.co/functions/v1/mercadopago-webhook`
3. Evento: **Payment**.
4. Salve e, se solicitado, configure a **assinatura secreta**:
   - Copie a *signing secret* gerada pelo MP;
   - Adicione como secret no Supabase: nome `MP_WEBHOOK_SECRET`, valor = a assinatura.
   *(Com a secret configurada, o site passa a validar a autenticidade de cada notificação.)*

---

## ETAPA 6 — Teste de ponta a ponta

1. Abra o site publicado (Vercel), escolha o evento → selecione um **kit** → preencha a inscrição.
2. Na tela de pagamento, escolha um método e clique em pagar — você deve ser **redirecionado ao Checkout Pro do Mercado Pago**.
3. Pague com um cartão de teste (ex.: `5031 4332 1540 6351`, CVV `123`, validade `11/30`, nome igual ao do usuário de teste do MP).
4. Ao voltar ao site, a tela de confirmação deve mostrar **"Pagamento aprovado"** automaticamente (confirmação no retorno + polling + webhook).
5. No **painel admin**, a inscrição deve mudar para **confirmada** sem ação manual; o relatório mostra participante, telefone e kit escolhidos.
6. Baixe o **comprovante em PDF** (agora gera `.pdf` com jsPDF).

### Como o status se atualiza sozinho (3 camadas)
- **Retorno do checkout (instantâneo):** ao voltar do MP, o site chama `confirm-checkout-payment`, que consulta o pagamento no MP e confirma a inscrição.
- **Webhook (autoritativo):** o MP notifica `mercadopago-webhook` a cada mudança de estado do pagamento (aprovação, estorno, pendência).
- **Polling (rede de segurança):** enquanto a tela de confirmação estiver aberta, o site reconsulta o status a cada poucos segundos.

---

## ETAPA 7 — Virar produção

Quando os testes passarem:
1. Gere o **Access Token de produção** no MP e substitua `MERCADOPAGO_ACCESS_TOKEN` no Supabase.
2. Atualize o webhook do MP apontando para a mesma URL (ele passa a receber eventos de produção).
3. Faça uma compra-teste real de baixo valor (ou cancele em seguida) para validar o fluxo completo.

---

## ❗ Checklist rápido

- [ ] Merge da branch no GitHub → deploy Vercel concluído
- [ ] `ADD_PRICE_TO_REGISTRATIONS.sql` executado
- [ ] `ADD_PARTICIPANT_TO_REGISTRATIONS.sql` executado
- [ ] `MERCADOPAGO_CHECKOUT_SETUP.sql` executado
- [ ] Secret `MERCADOPAGO_ACCESS_TOKEN` criado no Supabase
- [ ] 3 Edge Functions implantadas (create / confirm / webhook)
- [ ] Webhook cadastrado no Mercado Pago (+ `MP_WEBHOOK_SECRET` se usar assinatura)
- [ ] Compra de teste aprovada e inscrição confirmada automaticamente
- [ ] Relatório admin mostrando participante, telefone e kit + filtros funcionando

Se qualquer etapa apresentar erro, copie a mensagem exata (console F12 ou resposta do Supabase) e me envie que eu corrijo cirurgicamente.

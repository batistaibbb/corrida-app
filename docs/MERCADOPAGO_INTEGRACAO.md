# 🔗 Integração Mercado Pago — Checkout Pro com atualização automática de status

## Como funciona o fluxo agora

```
Atleta escolhe PIX/Cartão
        │
        ▼
[PaymentPage] → Edge Function create-checkout-payment
        │                    │
        │                    ├─ cria preferência no Mercado Pago (Checkout Pro)
        │                    ├─ salva payment 'pending' em payments (mp_init_point)
        │                    └─ devolve init_point (URL segura do MP)
        ▼
Redireciona para o checkout oficial do Mercado Pago
(PIX, cartão, boleto — processados pelo MP, PCI fica com eles)
        │
        ├──► MERCADO PAGO ──► notification_url ──► Edge Function mercadopago-webhook
        │                       (APROVAÇÃO CHEGA EM SEGUNDOS, MESMO SE O USUÁRIO
        │                        NÃO VOLTAR AO SITE: payments.status='approved',
        │                        registrations.status='confirmed')
        ▼
MP devolve o atleta para /pagamento/:id?status=approved&collection_id=...
        │
        ▼
[PaymentPage] detecta ?status → chama confirm-checkout-payment
        ├─ consulta o pagamento na API do MP (fonte da verdade)
        ├─ confirma payments + registration no banco (idempotente c/ webhook)
        ├─ se confirmado → redireciona sozinho para /comprovante/:id 🎉
        └─ se pending/rejected → mensagem clara + polling automático a cada 2s
             (assim que o webhook confirmar, a tela salta pro comprovante sozinha)
```

**Controle do administrador:** como o webhook atualiza `payments` e `registrations`
no banco em tempo real, o painel admin (Realtime já habilitado em `payments` e
`registrations`) vê as inscrições passarem de "Pagamento pendente" para
"Confirmada" automaticamente, sem nenhuma ação manual.

---

## Passo a passo de ativação

### 1. Credenciais do Mercado Pago
1. Acesse [Suas integrações](https://www.mercadopago.com.br/developers/panel/app) no painel do MP.
2. Crie uma aplicação → produto **Checkout Pro** → ative **Webhooks**.
3. Copie o **Access Token de produção** (`APP_USR-...`). Para testar antes, use o token de teste (`TEST-...`) e contas sandbox.

### 2. Configurar variáveis nas Edge Functions (Supabase)
No dashboard do Supabase → **Project Settings → Edge Functions → Secrets** (ou via CLI):

```bash
supabase secrets set \
  MERCADOPAGO_ACCESS_TOKEN="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  APP_URL="https://smartbrasilticket.vercel.app"
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem
> automaticamente em todas as Edge Functions.

### 3. Banco de dados
Execute **`MERCADOPAGO_CHECKOUT_SETUP.sql`** no SQL Editor do Supabase
(cria a coluna `mp_init_point` e o índice de lookup do webhook).

### 4. Deploy das Edge Functions
Na raiz do projeto (logado com `supabase login` + `supabase link`):

```bash
supabase functions deploy create-checkout-payment --no-verify-jwt=false
supabase functions deploy confirm-checkout-payment
supabase functions deploy mercadopago-webhook --no-verify-jwt
```

⚠️ **Importante:** o webhook precisa ser público (o Mercado Pago não envia JWT):
use `--no-verify-jwt` ao fazer deploy do `mercadopago-webhook`.

### 5. Registrar a URL do webhook no Mercado Pago
No painel do MP → sua aplicação → **Webhooks**, adicione:

```
https://<SUA-PROJECT-REF>.functions.supabase.co/functions/v1/mercadopago-webhook
```

Com o evento **payment** habilitado. (Como também enviamos `notification_url`
por preferência, o MP pode usar essa URL automaticamente.)

### 6. Publicar o site (Vercel) e testar
- Faça um pedido de teste com **cartão de teste sandbox** ou PIX de conta real (valores baixos).
- Confira: ao voltar do checkout, o atleta cai direto no **comprovante**; no admin, a inscrição aparece **Confirmada** sem clique.

---

## Arquivos desta integração

| Arquivo | Papel |
|---|---|
| `supabase/functions/create-checkout-payment/index.ts` | Cria a preferência de checkout e registra payment pendente |
| `supabase/functions/confirm-checkout-payment/index.ts` | Confirmação direta na volta do checkout (rede de segurança do webhook) |
| `supabase/functions/mercadopago-webhook/index.ts` | Recebe notificações do MP e atualiza status automaticamente |
| `MERCADOPAGO_CHECKOUT_SETUP.sql` | Coluna `mp_init_point` + índice para o webhook |
| `src/App.tsx` (PaymentPage) | Botões PIX/Cartão → inicia checkout; retorno `?status=`; polling até confirmar |

## Observações
- Em **modo demo** (sem Supabase configurado) o simulador antigo continua funcionando normalmente.
- A taxa exibida (5%) é apenas demonstrativa; o valor cobrado no MP é o preço total do kit.
- Cartões são processados **dentro da página do Mercado Pago** — nenhum dado sensível passa/toca nosso código (menos responsabilidade PCI).
- Rejeições/refunds cancelam a inscrição automaticamente (nunca cancelando uma já confirmada).

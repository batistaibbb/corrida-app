# 🏗️ ARQUITETURA DO SISTEMA - RUNBRASIL

## 📊 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                         USUÁRIO                              │
│                  (Browser / Mobile)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React + TypeScript + Vite + Tailwind                │  │
│  │                                                       │  │
│  │  • Página Inicial                                     │  │
│  │  • Detalhes do Evento                                 │  │
│  │  • Formulário de Inscrição                            │  │
│  │  • Pagamento (PIX/Cartão)                             │  │
│  │  • Comprovante                                        │  │
│  │  • Dashboard Admin                                    │  │
│  │  • Dashboard Participante                             │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTPS
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE (Backend)                         │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │   Auth           │  │   PostgreSQL Database        │   │
│  │                  │  │                               │   │
│  │  • Email/Pass    │  │  • profiles                   │   │
│  │  • OAuth         │  │  • races                      │   │
│  │  • JWT Tokens    │  │  • registrations              │   │
│  │  • Sessions      │  │  • payments                   │   │
│  └──────────────────┘  │  • reviews                    │   │
│                         └──────────────────────────────┘   │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │   Storage        │  │   Edge Functions             │   │
│  │                  │  │                               │   │
│  │  • event-images  │  │  • mercadopago-webhook        │   │
│  │  • avatars       │  │  • create-pix-payment         │   │
│  │  • documents     │  │  • create-card-payment        │   │
│  └──────────────────┘  └──────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTPS
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              MERCADO PAGO (Pagamentos)                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API de Pagamentos                                    │  │
│  │                                                       │  │
│  │  • PIX (QR Code + Copia e Cola)                      │  │
│  │  • Cartão de Crédito (até 12x)                       │  │
│  │  • Cartão de Débito                                   │  │
│  │  • Webhooks (notificações automáticas)               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Pagamento PIX (Produção)

```
1. PARTICIPANTE                    2. FRONTEND (Vercel)
   │                                  │
   │  Clica "Gerar PIX"               │
   │ ───────────────────────────────> │
   │                                  │
   │                                  │  3. Chama Edge Function
   │                                  │     create-pix-payment
   │                                  │ ──────────────────────┐
   │                                  │                       │
   │                                  │                       ▼
   │                                  │              4. SUPABASE
   │                                  │                 Edge Function
   │                                  │                       │
   │                                  │                       │  5. Cria pagamento
   │                                  │                       │     no Mercado Pago
   │                                  │                       │ ──────────────────┐
   │                                  │                       │                   │
   │                                  │                       │                   ▼
   │                                  │                       │          6. MERCADO PAGO
   │                                  │                       │             API
   │                                  │                       │                   │
   │                                  │                       │                   │  7. Retorna
   │                                  │                       │                   │     QR Code
   │                                  │                       │ <─────────────────┘
   │                                  │                       │
   │                                  │ <─────────────────────┘
   │                                  │
   │  8. Exibe QR Code                │
   │ <─────────────────────────────── │
   │                                  │
   │  9. Paga via app do banco        │
   │ ───────────────────────────────> │ (fora do sistema)
   │                                  │
   │                                  │
   │                                  │  10. MERCADO PAGO detecta pagamento
   │                                  │      e envia webhook
   │                                  │ <─────────────────────┐
   │                                  │                       │
   │                                  │                       ▼
   │                                  │              11. SUPABASE
   │                                  │                 Edge Function
   │                                  │                 mercadopago-webhook
   │                                  │                       │
   │                                  │                       │  12. Atualiza
   │                                  │                       │     payment status
   │                                  │                       │     no PostgreSQL
   │                                  │                       │
   │                                  │                       │  13. Atualiza
   │                                  │                       │     registration
   │                                  │                       │     status
   │                                  │                       │
   │                                  │                       │  14. (Futuro)
   │                                  │                       │     Envia email
   │                                  │                       │     de confirmação
   │                                  │                       │
   │  15. Realtime atualiza           │
   │      a tela automaticamente      │
   │ <─────────────────────────────── │
   │                                  │
   │  16. Comprovante disponível      │
   │ <─────────────────────────────── │
```

---

## 🗄️ Modelo de Dados (PostgreSQL)

```sql
┌─────────────────┐
│    profiles     │
├─────────────────┤
│ id (UUID, PK)   │──────┐
│ email           │      │
│ name            │      │
│ cpf             │      │
│ phone           │      │
│ role            │      │
│ avatar_url      │      │
│ created_at      │      │
└─────────────────┘      │
                         │
                         │ 1:N
                         ▼
┌─────────────────┐      │      ┌─────────────────┐
│     races       │      │      │  registrations  │
├─────────────────┤      │      ├─────────────────┤
│ id (UUID, PK)   │<─────┼──────│ race_id (FK)    │
│ name            │      │      │ id (UUID, PK)   │
│ date            │      │      │ user_id (FK)    │──────┐
│ time            │      │      │ distance        │      │
│ location        │      │      │ tshirt_size     │      │
│ city            │      │      │ status          │      │
│ state           │      │      │ payment_id (FK) │─────┐│
│ image_url       │      │      │ confirmation_   │     ││
│ description     │      │      │   code          │     ││
│ organizer_id    │      │      │ emergency_name  │     ││
│ organizer_name  │      │      │ emergency_phone │     ││
│ participants_   │      │      │ created_at      │     ││
│   count         │      │      └─────────────────┘     ││
│ max_participants│      │                              ││
│ category        │      │                              ││
│ sport           │      │                              ││
│ status          │      │                              ││
│ includes (JSONB)│      │                              ││
│ rules (JSONB)   │      │                              ││
│ rating          │      │                              ││
│ reviews_count   │      │                              ││
│ featured        │      │                              ││
│ discount        │      │                              ││
│ tags (JSONB)    │      │                              ││
│ distances (JSONB│      │                              ││
│ created_at      │      │                              ││
└─────────────────┘      │                              ││
                         │                              ││
                         │                              ││
                         │                              ││
                         │         ┌─────────────────┐  ││
                         │         │    payments     │  ││
                         │         ├─────────────────┤  ││
                         │         │ id (UUID, PK)   │  ││
                         │         │ registration_id │◄─┘│
                         │         │   (FK)          │   │
                         │         │ method          │   │
                         │         │ amount          │   │
                         │         │ service_fee     │   │
                         │         │ total           │   │
                         │         │ status          │   │
                         │         │ pix_code        │   │
                         │         │ pix_qr_code     │   │
                         │         │ mercadopago_    │   │
                         │         │   payment_id    │   │
                         │         │ transaction_id  │   │
                         │         │ paid_at         │   │
                         │         │ created_at      │   │
                         │         └─────────────────┘   │
                         │                               │
                         └───────────────────────────────┘
```

---

## 🔐 Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado:

- **profiles**: Usuários só veem/editam seu próprio perfil
- **races**: Público vê apenas eventos ativos; admins veem tudo
- **registrations**: Usuários veem apenas suas inscrições; admins veem tudo
- **payments**: Usuários veem apenas seus pagamentos; admins veem tudo

### Autenticação

- Supabase Auth com JWT tokens
- Tokens enviados em cada requisição à API
- Sessões persistentes com refresh automático

### Edge Functions

- Webhook do Mercado Pago usa service role key (bypass RLS)
- Validação de assinatura do webhook (em produção)
- Rate limiting automático do Supabase

---

## 🚀 Performance

### Frontend (Vercel)
- Build otimizado com Vite
- Code splitting automático
- Assets com cache imutável
- CDN global

### Backend (Supabase)
- PostgreSQL com índices otimizados
- Conexões pooladas
- Edge Functions em CDN global
- Realtime para atualizações instantâneas

### Banco de Dados
- Índices em campos frequentemente consultados
- JSONB para dados flexíveis (includes, rules, tags, distances)
- Triggers para atualização automática de contadores

---

## 📈 Escalabilidade

### Horizontal
- Vercel: Auto-scaling automático
- Supabase: Scale up/down conforme necessidade
- Edge Functions: Distribuídas globalmente

### Vertical
- Supabase Pro: Mais recursos (CPU, RAM, storage)
- Banco de dados: Read replicas (Supabase Pro)
- Storage: Limite de 250GB (Supabase Pro)

---

## 🔄 CI/CD Pipeline

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Developer│      │  GitHub  │      │  Vercel  │      │ Supabase │
│           │      │          │      │          │      │          │
│ git push  │─────>│ Actions  │─────>│ Deploy   │─────>│ Migrate  │
│           │      │          │      │          │      │          │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
                        │
                        │
                        ▼
                  ┌──────────┐
                  │  Tests   │
                  │          │
                  │ • Lint   │
                  │ • Build  │
                  │ • Type   │
                  └──────────┘
```

---

## 💰 Custos Estimados (Mensal)

### Cenário: 1000 inscrições/mês

| Serviço | Plano | Custo |
|---------|-------|-------|
| **Vercel** | Pro | $20 |
| **Supabase** | Pro | $25 |
| **GitHub** | Free | $0 |
| **Mercado Pago** | Taxas | ~R$ 300 (1.5% médio) |
| **Domínio** | .com.br | ~R$ 40/ano |
| **TOTAL** | | **~R$ 350/mês** |

### Cenário: 10.000 inscrições/mês

| Serviço | Plano | Custo |
|---------|-------|-------|
| **Vercel** | Pro | $20 |
| **Supabase** | Pro | $25 |
| **GitHub** | Team | $4/user |
| **Mercado Pago** | Taxas | ~R$ 3.000 (1.5% médio) |
| **TOTAL** | | **~R$ 3.300/mês** |

---

## 🎯 Próximos Passos

### Fase 1: MVP (Atual)
- ✅ Autenticação básica
- ✅ CRUD de eventos
- ✅ Inscrições
- ✅ Pagamento PIX/Cartão
- ✅ Comprovantes

### Fase 2: Melhorias
- [ ] Email de confirmação (Resend/SendGrid)
- [ ] Upload de atestado médico
- [ ] QR Code para check-in no evento
- [ ] Área do organizador
- [ ] Relatórios avançados

### Fase 3: Escala
- [ ] App mobile (React Native)
- [ ] Sistema de ranking
- [ ] Integração com Strava
- [ ] Marketplace de eventos
- [ ] Programa de afiliados

---

**Arquitetura moderna, escalável e pronta para produção!** 🚀

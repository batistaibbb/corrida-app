# 🚀 GUIA COMPLETO DE SETUP - SMART BRASIL TICKET

Este guia vai te ajudar a configurar e fazer deploy do projeto Smart Brasil Ticket usando **GitHub**, **Supabase** e **Vercel**.

---

## 📋 PRÉ-REQUISITOS

- ✅ Conta no [GitHub](https://github.com)
- ✅ Conta no [Supabase](https://supabase.com)
- ✅ Conta na [Vercel](https://vercel.com)
- ✅ Conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
- ✅ Node.js 18+ instalado
- ✅ Git instalado

---

## 🔧 PASSO 1: CONFIGURAR O SUPABASE

### 1.1 Criar Projeto no Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `smart-brasil-ticket`
   - **Database Password:** (gere uma senha forte e guarde)
   - **Region:** `South America (São Paulo)`
   - **Pricing Plan:** Free (para começar)
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos para o projeto ser provisionado

### 1.2 Executar o Schema SQL

1. No dashboard do Supabase, vá em **SQL Editor** (ícone no menu lateral)
2. Clique em **"New Query"**
3. Copie o conteúdo do arquivo `supabase/migrations/001_initial_schema.sql`
4. Cole no editor e clique em **"Run"** (ou Ctrl+Enter)
5. Verifique se todas as tabelas foram criadas em **Table Editor**

### 1.3 Criar Storage Bucket

1. Vá em **Storage** (menu lateral)
2. Clique em **"New bucket"**
3. Configure:
   - **Name:** `event-images`
   - **Public bucket:** ✅ Marcado
   - **Maximum file size:** `5MB`
   - **Allowed MIME types:** `image/*`
4. Clique em **"Create bucket"**

### 1.4 Criar Usuário Admin

1. Vá em **Authentication** → **Users**
2. Clique em **"Add user"** → **"Create new user"**
3. Preencha:
   - **Email:** `admin@smartbrasilticket.com.br`
   - **Password:** `admin123` (ou outra senha forte)
   - **Auto Confirm User:** ✅ Marcado
4. Clique em **"Create user"**
5. Copie o **UID** do usuário criado
6. Vá em **SQL Editor** e execute:

```sql
INSERT INTO public.profiles (id, email, name, role)
VALUES ('COLE_O_UID_AQUI', 'admin@smartbrasilticket.com.br', 'Administrador', 'admin');
```

### 1.5 Obter Credenciais

1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **anon public key** (começa com `eyJ...`)

---

## 💳 PASSO 2: CONFIGURAR MERCADO PAGO

### 2.1 Criar Aplicação

1. Acesse [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Clique em **"Minhas integrações"**
3. Clique em **"Criar aplicação"**
4. Preencha:
   - **Nome:** `Smart Brasil Ticket`
   - **Descrição:** `Plataforma de inscrições para corridas`
5. Clique em **"Criar aplicação"**

### 2.2 Obter Credenciais

1. Na página da aplicação, vá em **"Credenciais de teste"** (para desenvolvimento)
2. Copie:
   - **Public Key** (começa com `TEST-...`)
   - **Access Token** (começa com `TEST-...`)

⚠️ **IMPORTANTE:** Para produção, use as **"Credenciais de produção"** após homologação.

### 2.3 Configurar Webhook

1. Na aplicação, vá em **"Webhooks"**
2. Clique em **"Configurar notificações"**
3. Adicione a URL:
```
https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook
```
4. Selecione os eventos:
   - ✅ `payments`
5. Salve as configurações

---

## 🗄️ PASSO 3: DEPLOYAR EDGE FUNCTIONS

### 3.1 Instalar Supabase CLI

```bash
npm install -g supabase
```

### 3.2 Login no Supabase

```bash
supabase login
```

Isso abrirá o navegador para autenticação.

### 3.3 Linkar o Projeto

```bash
supabase link --project-ref SEU_PROJECT_REF
```

O `project-ref` está na URL do seu projeto Supabase (ex: `abc123`).

### 3.4 Configurar Secrets

```bash
# Mercado Pago Access Token
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN_AQUI
```

### 3.5 Deploy das Functions

```bash
# Deploy webhook
supabase functions deploy mercadopago-webhook --no-verify-jwt

# Deploy criação de pagamento PIX
supabase functions deploy create-pix-payment

# Deploy criação de pagamento Cartão
supabase functions deploy create-card-payment
```

### 3.6 Testar as Functions

Acesse no navegador:
```
https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook
```

Deve retornar um erro (pois não há payload), mas confirma que está funcionando.

---

## 🌐 PASSO 4: CONFIGURAR VARIÁVEIS DE AMBIENTE

### 4.1 Criar arquivo .env.local

Na raiz do projeto, crie o arquivo `.env.local`:

```bash
# Supabase
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ⚠️ O Access Token do Mercado Pago NÃO vai no frontend (nem em variáveis VITE_*).
# Configure-o como secret do Supabase (server-side, lido pelas Edge Functions):
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=TEST-YOUR-ACCESS-TOKEN
```

⚠️ **NUNCA** commite este arquivo! Ele está no `.gitignore`.

### 4.2 Testar localmente

```bash
npm run dev
```

Acesse `http://localhost:5173`

---

## 📦 PASSO 5: PUBLICAR NO GITHUB

### 5.1 Inicializar repositório

```bash
git init
git add .
git commit -m "Initial commit - Smart Brasil Ticket platform"
```

### 5.2 Criar repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Preencha:
   - **Repository name:** `smart-brasil-ticket`
   - **Description:** `Plataforma de inscrições para corridas de rua`
   - **Public/Private:** Sua escolha
3. **NÃO** marque "Initialize with README"
4. Clique em **"Create repository"**

### 5.3 Push para o GitHub

```bash
git remote add origin https://github.com/SEU-USUARIO/smart-brasil-ticket.git
git branch -M main
git push -u origin main
```

---

## 🚀 PASSO 6: DEPLOY NA VERCEL

### 6.1 Conectar Vercel ao GitHub

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em **"Import Git Repository"**
3. Selecione o repositório `smart-brasil-ticket`
4. Clique em **"Import"**

### 6.2 Configurar Variáveis de Ambiente na Vercel

Na tela de configuração do projeto:

1. Expanda **"Environment Variables"**
2. Adicione:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` |

> ⚠️ Não adicione credenciais do Mercado Pago aqui — o Access Token fica nos secrets das Edge Functions (`supabase secrets set MERCADOPAGO_ACCESS_TOKEN=...`).

3. Clique em **"Deploy"**

### 6.3 Aguardar o Deploy

A Vercel vai:
1. Clonar o repositório
2. Instalar dependências
3. Buildar o projeto
4. Fazer deploy

Em ~2 minutos você terá uma URL como:
```
https://smart-brasil-ticket-xyz.vercel.app
```

### 6.4 Configurar Domínio Customizado (Opcional)

1. No dashboard da Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio (ex: `smartbrasilticket.com.br`)
3. Siga as instruções para configurar DNS

---

## 🔐 PASSO 7: CONFIGURAR CI/CD AUTOMÁTICO

### 7.1 Adicionar Secrets no GitHub

1. No repositório, vá em **Settings** → **Secrets and variables** → **Actions**
2. Adicione os seguintes secrets:

| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `VERCEL_TOKEN` | Token da Vercel (veja abaixo) |
| `VERCEL_ORG_ID` | ID da organização Vercel |
| `VERCEL_PROJECT_ID` | ID do projeto Vercel |

### 7.2 Obter Vercel Token

1. Acesse [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Clique em **"Create Token"**
3. Nome: `GitHub Actions`
4. Copie o token e adicione como secret no GitHub

### 7.3 Obter IDs da Vercel

```bash
# Instale Vercel CLI
npm i -g vercel

# Login
vercel login

# Link ao projeto
vercel link

# Os IDs estarão em .vercel/project.json
```

---

## ✅ CHECKLIST FINAL

### Supabase
- [ ] Projeto criado
- [ ] Schema SQL executado
- [ ] Storage bucket `event-images` criado
- [ ] Usuário admin criado
- [ ] Credenciais copiadas

### Mercado Pago
- [ ] Aplicação criada
- [ ] Credenciais obtidas (Public Key + Access Token)
- [ ] Webhook configurado

### Edge Functions
- [ ] Supabase CLI instalado
- [ ] Functions deployadas (webhook, pix, card)
- [ ] Secrets configurados

### Variáveis de Ambiente
- [ ] `.env.local` criado localmente
- [ ] Variáveis configuradas na Vercel
- [ ] Secrets configurados no GitHub

### Deploy
- [ ] Código publicado no GitHub
- [ ] Projeto conectado na Vercel
- [ ] Deploy realizado com sucesso
- [ ] Site acessível pela URL

---

## 🧪 TESTANDO O FLUXO COMPLETO

### 1. Testar Login
- Acesse o site deployado
- Faça login com `admin@smartbrasilticket.com.br` / `admin123`
- Você deve ser redirecionado para o dashboard admin

### 2. Testar Criação de Evento
- No dashboard admin, clique em **"Novo Evento"**
- Preencha os dados e salve
- O evento deve aparecer na página inicial

### 3. Testar Inscrição
- Faça logout e crie uma conta de participante
- Escolha um evento e faça inscrição
- Preencha o formulário em 3 etapas

### 4. Testar Pagamento PIX
- Na tela de pagamento, escolha **PIX**
- Clique em **"Gerar PIX"**
- Em produção, um QR Code real será gerado
- Na demo, clique em **"Simular Aprovação"**

### 5. Testar Comprovante
- Após pagamento aprovado, você será redirecionado
- Baixe o comprovante em formato texto
- Verifique se todos os dados estão corretos

---

## 🐛 TROUBLESHOOTING

### Erro: "Missing Supabase environment variables"
- Verifique se o arquivo `.env.local` existe
- Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão preenchidos
- Reinicie o servidor de desenvolvimento

### Erro: "relation already exists"
- As tabelas já foram criadas
- Verifique no **Table Editor** do Supabase

### Webhook não funciona
- Confirme que a URL do webhook está correta
- Verifique se as Edge Functions foram deployadas
- Cheque os logs em **Edge Functions** → **Logs**

### Pagamento não é aprovado
- Verifique se está usando credenciais de teste
- Confirme que o webhook está configurado no Mercado Pago
- Cheque os logs da Edge Function

---

## 📞 SUPORTE

- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Mercado Pago Docs:** https://www.mercadopago.com.br/developers

---

**🎉 Parabéns! Seu projeto RunBrasil está pronto para produção!**

# Smart Brasil Ticket - Plataforma de Inscrições para Eventos Esportivos

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new)

Plataforma completa e funcional para inscrição em eventos esportivos, utilizando **Mercado Pago** para pagamentos (PIX e Cartão).

## 🏗️ Stack Tecnológica

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Pagamentos:** Mercado Pago (PIX + Cartão)
- **Deploy:** Vercel (frontend) + Supabase (backend)
- **CI/CD:** GitHub Actions
- **Versionamento:** GitHub

## 🚀 Funcionalidades Implementadas

### 👤 Perfis de Usuário

#### 1. **Administrador da Plataforma**
- Dashboard completo com métricas e KPIs
- CRUD de eventos (criar, editar, excluir)
- Gestão de inscrições
- Aprovação de pagamentos pendentes
- Visualização de receita e métricas

#### 2. **Participante**
- Dashboard pessoal com estatísticas
- Visualização de inscrições
- Pagamento de inscrições pendentes
- Download de comprovantes
- Perfil do atleta

### 💳 Sistema de Pagamento (Mercado Pago)

#### **PIX**
- Geração de QR Code
- Código copia e cola
- 5% de desconto
- Aprovação automática via webhook

#### **Cartão de Crédito/Débito**
- Formulário completo de cartão
- Parcelamento em até 12x
- Processamento via Mercado Pago
- Aprovação instantânea

### 📄 Comprovantes
- Geração automática após pagamento
- Download em formato texto
- Código de confirmação único

## 🔐 Credenciais de Demonstração

### Admin
- **Email:** admin@smartbrasilticket.com.br
- **Senha:** admin123
- **Acesso:** `/admin`

### Participante
- **Email:** joao@email.com
- **Senha:** 123456
- **Acesso:** `/minha-conta`

## 💰 Custos e Taxas (Mercado Pago)

### Sem Custo Fixo Mensal!
- ✅ **Webhook:** GRÁTIS
- ✅ **API:** GRÁTIS
- ✅ **Conta:** GRÁTIS

### Taxas por Transação:
- 💰 **PIX:** 0,99% por transação
- 💰 **Cartão débito:** 1,99% por transação
- 💰 **Cartão crédito à vista:** 3,48% a 4,98%
- 💰 **Cartão crédito parcelado:** 3,48% + juros

### Exemplo Prático:
```
Inscrição de R$ 200,00 via PIX:
- Taxa Mercado Pago (0,99%): R$ 1,98
- Você recebe: R$ 198,02
```

## 🔄 Fluxo de Pagamento com Webhook

### PIX
1. Participante seleciona "PIX"
2. Sistema gera QR Code via API Mercado Pago
3. Participante paga via app do banco
4. Mercado Pago envia webhook → Sistema
5. Sistema aprova automaticamente
6. Inscrição confirmada
7. Comprovante disponível

### Cartão
1. Participante preenche dados do cartão
2. Sistema envia para Mercado Pago via API
3. Mercado Pago processa (2-5 segundos)
4. Retorna aprovação/rejeição
5. Se aprovado: inscrição confirmada
6. Comprovante disponível

## 🛠️ Tecnologias

- **React 18** + **TypeScript**
- **React Router** para navegação
- **Context API** para estado global
- **Tailwind CSS** para estilização
- **date-fns** para manipulação de datas
- **Lucide React** para ícones
- **LocalStorage** para persistência (simulando backend)

## 📊 Próximos Passos para Produção

### Backend
- [ ] Implementar API REST (Node.js/Express)
- [ ] Banco de dados (PostgreSQL/MongoDB)
- [ ] Autenticação JWT
- [ ] Integração real com Mercado Pago API
- [ ] Webhooks para confirmação de pagamentos
- [ ] Upload de imagens (AWS S3/Cloudinary)

### Mercado Pago Integration
```javascript
// Exemplo de integração com Mercado Pago
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: 'YOUR_ACCESS_TOKEN'
});

// Criar pagamento PIX
const payment = await mercadopago.payment.create({
  transaction_amount: 262.40,
  description: 'Inscrição Corrida São Silvestre',
  payment_method_id: 'pix',
  payer: {
    email: 'joao@email.com',
    first_name: 'João',
    last_name: 'Pereira',
  }
});

// Webhook para receber notificações
app.post('/webhook/mercadopago', (req, res) => {
  const payment = req.body;
  
  if (payment.action === 'payment.updated') {
    // Buscar pagamento no Mercado Pago
    const paymentData = await mercadopago.payment.get(payment.data.id);
    
    if (paymentData.status === 'approved') {
      // Atualizar inscrição no banco
      await db.registrations.update(registrationId, {
        status: 'confirmed',
        paymentId: paymentData.id
      });
      
      // Enviar email de confirmação
      await sendConfirmationEmail(user.email, registrationData);
    }
  }
  
  res.sendStatus(200);
});
```

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 📱 Fluxo Completo

### Participante
1. Acessa página inicial → Vê eventos
2. Clica em evento → Vê detalhes
3. Seleciona distância → Clica "Inscreva-se"
4. Preenche formulário (3 etapas)
5. Escolhe pagamento (PIX ou Cartão)
6. Efetua pagamento
7. Recebe confirmação e comprovante

### Administrador
1. Login no painel admin
2. Cria/edita eventos
3. Acompanha inscrições
4. Aprova pagamentos pendentes
5. Visualiza relatórios e receita

## 📞 Suporte

Para dúvidas ou suporte:
- **Email:** contato@smartbrasilticket.com.br
- **Telefone:** (11) 4002-8922

---

**Desenvolvido com ❤️ para o mercado esportivo brasileiro**

**Integração de Pagamento:** Mercado Pago (PIX + Cartão)
**Custo:** Apenas taxa por transação (sem mensalidade)

---

## 🚀 Deploy Rápido

### 1. Configurar Supabase
- Crie um projeto em [supabase.com](https://supabase.com)
- Execute o SQL em `supabase/migrations/001_initial_schema.sql`
- Crie um bucket `event-images` no Storage
- Copie as credenciais (URL + anon key)

### 2. Configurar Mercado Pago
- Crie uma aplicação em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
- Copie Public Key e Access Token
- Configure webhook apontando para sua Edge Function

### 3. Deploy na Vercel
- Conecte o repositório GitHub na Vercel
- Adicione as variáveis de ambiente (veja `.env.example`)
- Deploy automático a cada push!

📖 **Guia completo:** Consulte [SETUP_GUIDE.md](./SETUP_GUIDE.md) para instruções detalhadas.

---

## 📁 Estrutura do Projeto

```
smart-brasil-ticket/
├── src/                    # Código frontend
│   ├── App.tsx            # Componente principal
│   ├── lib/
│   │   └── supabase.ts    # Cliente Supabase
│   ├── contexts/          # Context API (Auth, Data)
│   ├── data/              # Dados mockados (fallback)
│   └── types/             # Tipos TypeScript
├── supabase/
│   ├── migrations/        # Schema SQL do banco
│   └── functions/         # Edge Functions
│       ├── mercadopago-webhook/
│       ├── create-pix-payment/
│       └── create-card-payment/
├── .github/workflows/     # CI/CD GitHub Actions
├── .env.example           # Template de variáveis
├── vercel.json            # Configuração Vercel
└── SETUP_GUIDE.md         # Guia completo de setup
```

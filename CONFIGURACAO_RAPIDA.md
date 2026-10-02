# ⚡ Configuração Rápida do Supabase

## 🎯 Objetivo
Configurar o Supabase em 10 minutos para ter o sistema funcionando em produção.

---

## 📋 Checklist

### ✅ Passo 1: Verificar Variáveis de Ambiente

Confirme que estas variáveis estão configuradas na Vercel:

```
VITE_SUPABASE_URL=https://pfrxuxiohxwhtcxvjnbd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Onde verificar:**
1. Acesse: https://vercel.com/batistaibbb-3793/corrida-app/settings/environment-variables
2. Confirme que as variáveis existem
3. Se não existirem, adicione-as

---

### ✅ Passo 2: Criar Tabelas no Supabase

1. Acesse: https://supabase.com/dashboard/project/pfrxuxiohxwhtcxvjnbd/sql/new

2. Copie e cole o SQL abaixo:

```sql
-- Tabela de eventos
CREATE TABLE IF NOT EXISTS races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  organizer_id UUID REFERENCES auth.users(id),
  organizer_name TEXT,
  participants_count INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 1000,
  category TEXT NOT NULL,
  sport TEXT NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  registration_status TEXT DEFAULT 'upcoming',
  includes JSONB DEFAULT '[]',
  rules JSONB DEFAULT '[]',
  rating DECIMAL(2,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  discount INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  distances JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de inscrições
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  race_id UUID REFERENCES races(id),
  distance DECIMAL NOT NULL,
  tshirt_size TEXT,
  status TEXT DEFAULT 'pending_payment',
  payment_id UUID,
  confirmation_code TEXT UNIQUE,
  emergency_name TEXT,
  emergency_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id),
  method TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  service_fee DECIMAL NOT NULL,
  total DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending',
  pix_code TEXT,
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. Clique em **"Run"** (ou pressione Ctrl+Enter)

4. Confirme que as tabelas foram criadas:
   - Vá em **Table Editor** no menu lateral
   - Você deve ver: `races`, `registrations`, `payments`

---

### ✅ Passo 3: Habilitar Realtime

1. No **SQL Editor**, execute:

```sql
-- Habilitar Realtime
ALTER TABLE races REPLICA IDENTITY FULL;
ALTER TABLE registrations REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;

-- Publicar tabelas para Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE races;
ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
```

2. Clique em **"Run"**

3. Confirme que Realtime está habilitado:
   - Vá em **Realtime** no menu lateral
   - Você deve ver as 3 tabelas listadas

---

### ✅ Passo 4: Configurar Políticas RLS (Segurança)

1. No **SQL Editor**, execute:

```sql
-- Habilitar RLS
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Políticas para races
CREATE POLICY "Eventos publicados são visíveis para todos"
  ON races FOR SELECT
  USING (published = true);

CREATE POLICY "Admins podem ver todos os eventos"
  ON races FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins podem criar eventos"
  ON races FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins podem atualizar eventos"
  ON races FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins podem deletar eventos"
  ON races FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas para registrations
CREATE POLICY "Usuários podem ver suas próprias inscrições"
  ON registrations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem ver todas as inscrições"
  ON registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Usuários podem criar inscrições"
  ON registrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas inscrições"
  ON registrations FOR UPDATE
  USING (user_id = auth.uid());

-- Políticas para payments
CREATE POLICY "Usuários podem ver seus próprios pagamentos"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registrations 
      WHERE registrations.id = payments.registration_id 
      AND registrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem ver todos os pagamentos"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Usuários podem criar pagamentos"
  ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM registrations 
      WHERE registrations.id = payments.registration_id 
      AND registrations.user_id = auth.uid()
    )
  );
```

2. Clique em **"Run"**

---

### ✅ Passo 5: Inserir Dados Iniciais (Opcional)

Se você quer começar com alguns eventos de exemplo:

1. No **SQL Editor**, execute:

```sql
INSERT INTO races (name, date, time, location, city, state, image_url, description, organizer_name, max_participants, category, sport, published, registration_status, distances) VALUES
(
  'Corrida Internacional de São Silvestre',
  '2026-12-31',
  '06:00',
  'Av. Paulista, 1578',
  'São Paulo',
  'SP',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop',
  'A mais tradicional corrida de rua do Brasil!',
  'Fundação Cásper Líbero',
  35000,
  'Internacional',
  'corrida',
  true,
  'upcoming',
  '[{"km": 5, "price": 189.90}, {"km": 10, "price": 249.90}, {"km": 15, "price": 329.90}]'
),
(
  'Meia Maratona do Rio de Janeiro',
  '2026-07-19',
  '06:30',
  'Praia de Copacabana',
  'Rio de Janeiro',
  'RJ',
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&h=400&fit=crop',
  'Corra com vista para o mar na Cidade Maravilhosa!',
  'Run Events Brasil',
  20000,
  'Meia Maratona',
  'corrida',
  true,
  'upcoming',
  '[{"km": 5, "price": 119.90}, {"km": 10, "price": 159.90}, {"km": 21, "price": 219.90}]'
),
(
  'Trail Run Serra da Mantiqueira',
  '2026-09-13',
  '07:00',
  'Parque Nacional da Serra da Mantiqueira',
  'Campos do Jordão',
  'SP',
  'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=400&fit=crop',
  'Uma aventura pelos trilhos da Serra da Mantiqueira!',
  'Trail Adventures',
  2000,
  'Trail Run',
  'corrida',
  true,
  'upcoming',
  '[{"km": 10, "price": 149.90}, {"km": 21, "price": 199.90}, {"km": 42, "price": 299.90}]'
);
```

2. Clique em **"Run"**

---

### ✅ Passo 6: Testar

1. Acesse o site: https://corrida-app-sooty.vercel.app/

2. Abra o Console do navegador (F12)

3. Você deve ver:
   ```
   🔍 Supabase Config: { url: "✅ Configurado", key: "✅ Configurado" }
   🔍 Supabase Status: { client: "✅ Criado", demoMode: "✅ MODO PRODUÇÃO" }
   ```

4. Faça login como admin:
   - Email: `admin@runbrasil.com.br`
   - Senha: `1Corintios10.31`

5. Crie um novo evento

6. Abra o site em outro navegador (ou aba anônima)

7. Faça login como usuário comum

8. O evento criado pelo admin deve aparecer automaticamente!

---

## 🎉 Pronto!

Seu sistema agora está 100% funcional com Supabase:

- ✅ Dados centralizados no banco de dados
- ✅ Sincronização em tempo real
- ✅ Multi-usuário funcionando
- ✅ Persistência garantida
- ✅ Segurança com RLS

---

## 🐛 Problemas Comuns

### "Table does not exist"
**Solução:** Execute o SQL do Passo 2 novamente

### "Permission denied"
**Solução:** Execute o SQL do Passo 4 (políticas RLS)

### "Realtime not working"
**Solução:** Execute o SQL do Passo 3 (habilitar Realtime)

### "Data not syncing"
**Solução:** 
1. Verifique o Console do navegador para erros
2. Confirme que Realtime está habilitado no Supabase
3. Recarregue a página

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs no Console do navegador (F12)
2. Verifique os logs no dashboard do Supabase
3. Consulte: `MIGRACAO_SUPABASE.md` para detalhes completos

---

**Tempo estimado: 10 minutos** ⏱️

**Dificuldade: Fácil** 🟢

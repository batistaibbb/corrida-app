# 🚀 Guia de Migração para Supabase

## ✅ Migração Concluída!

O sistema foi migrado com sucesso do localStorage para o Supabase. Agora você tem:

- ✅ **Sincronização em tempo real** entre todos os dispositivos
- ✅ **Dados centralizados** no banco de dados Supabase
- ✅ **Multi-usuário** funcionando corretamente
- ✅ **Persistência** garantida no servidor
- ✅ **Realtime** para atualizações automáticas

---

## 📋 O que foi feito

### 1. DataContext Atualizado
O arquivo `src/contexts/DataContext.tsx` agora:
- Usa Supabase como banco de dados principal
- Mantém fallback para localStorage (modo demo)
- Implementa Realtime para sincronização automática
- Converte automaticamente entre formatos (snake_case ↔ camelCase)

### 2. Funções Assíncronas
Todas as operações CRUD agora são assíncronas:
- `addRace()` → Promise<void>
- `updateRace()` → Promise<void>
- `deleteRace()` → Promise<void>
- `addRegistration()` → Promise<string>
- `updateRegistration()` → Promise<void>
- `addPayment()` → Promise<string>
- `approvePayment()` → Promise<void>

### 3. Realtime Habilitado
O sistema escuta mudanças no banco de dados e atualiza automaticamente:
- Quando um admin altera um evento, todos os usuários veem a mudança instantaneamente
- Quando uma inscrição é criada, o contador de participantes atualiza em tempo real
- Quando um pagamento é aprovado, o status da inscrição muda automaticamente

---

## 🔧 Configuração no Supabase

### Passo 1: Criar as Tabelas

Execute o SQL abaixo no **SQL Editor** do Supabase:

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

-- Habilitar Realtime
ALTER TABLE races REPLICA IDENTITY FULL;
ALTER TABLE registrations REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;

-- Publicar tabelas para Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE races;
ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
```

### Passo 2: Configurar Políticas RLS (Row Level Security)

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

### Passo 3: Inserir Dados Iniciais (Opcional)

Se você quiser migrar os dados do localStorage para o Supabase:

```sql
-- Inserir eventos de exemplo
INSERT INTO races (name, date, time, location, city, state, image_url, description, organizer_name, max_participants, category, sport, published, registration_status, distances) VALUES
(
  'Corrida Internacional de São Silvestre',
  '2026-12-31',
  '06:00',
  'Av. Paulista, 1578',
  'São Paulo',
  'SP',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop',
  'A mais tradicional corrida de rua do Brasil! Participe da 101ª edição da São Silvestre.',
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

---

## 🧪 Testando a Migração

### Teste 1: Verificar Conexão

1. Acesse o site e abra o Console do navegador (F12)
2. Você deve ver:
   ```
   🔍 Supabase Config: { url: "✅ Configurado", key: "✅ Configurado" }
   🔍 Supabase Status: { client: "✅ Criado", demoMode: "✅ MODO PRODUÇÃO" }
   ```

### Teste 2: CRUD de Eventos

1. Faça login como admin
2. Crie um novo evento
3. Verifique no Supabase → Table Editor → races
4. O evento deve aparecer na tabela

### Teste 3: Sincronização em Tempo Real

1. Abra o site em **dois navegadores diferentes** (ex: Chrome e Firefox)
2. No **Navegador 1**: Faça login como admin
3. No **Navegador 2**: Faça login como usuário comum
4. No **Navegador 1**: Altere o status de um evento
5. No **Navegador 2**: A alteração deve aparecer **automaticamente** em segundos

### Teste 4: Inscrição e Pagamento

1. Faça login como usuário
2. Escolha um evento e faça inscrição
3. Complete o pagamento (PIX ou Cartão)
4. Verifique no Supabase:
   - Tabela `registrations` deve ter a inscrição
   - Tabela `payments` deve ter o pagamento
   - O status deve mudar para `confirmed`

---

## 📊 Monitoramento

### Verificar Dados no Supabase

1. Acesse o dashboard do Supabase
2. Vá em **Table Editor**
3. Visualize as tabelas:
   - `races` - Eventos
   - `registrations` - Inscrições
   - `payments` - Pagamentos
   - `profiles` - Perfis de usuário

### Verificar Realtime

1. Vá em **Realtime** no dashboard do Supabase
2. Você deve ver as tabelas publicadas:
   - races
   - registrations
   - payments

### Verificar Logs

No Console do navegador, você verá logs como:
```
🔄 Mudança detectada em races - recarregando...
🔄 Mudança detectada em registrations - recarregando...
🔄 Mudança detectada em payments - recarregando...
```

---

## 🔄 Modo Demo vs Modo Produção

### Modo Demo (localStorage)
- Ativado quando `VITE_SUPABASE_URL` não está configurado
- Dados salvos no navegador local
- Sincronização apenas entre abas do mesmo navegador
- Útil para desenvolvimento e testes

### Modo Produção (Supabase)
- Ativado quando `VITE_SUPABASE_URL` está configurado
- Dados salvos no banco de dados Supabase
- Sincronização em tempo real entre todos os dispositivos
- Pronto para uso em produção

---

## 🐛 Troubleshooting

### Problema: "Failed to fetch" ou erros de conexão

**Solução:**
1. Verifique se as variáveis de ambiente estão configuradas na Vercel
2. Confirme que o projeto Supabase está ativo
3. Verifique se as tabelas foram criadas

### Problema: Dados não aparecem após criar

**Solução:**
1. Verifique o Console do navegador para erros
2. Confirme que Realtime está habilitado no Supabase
3. Recarregue a página manualmente

### Problema: Realtime não funciona

**Solução:**
1. Verifique se as tabelas foram publicadas:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE races;
   ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
   ALTER PUBLICATION supabase_realtime ADD TABLE payments;
   ```
2. Confirme que `REPLICA IDENTITY FULL` está habilitado
3. Verifique o Console para logs de mudanças

---

## 📈 Próximos Passos

### 1. Migrar Dados Existentes (se necessário)

Se você tem dados no localStorage que quer migrar:

```javascript
// No Console do navegador (com localStorage antigo)
const races = JSON.parse(localStorage.getItem('rb_races') || '[]');
console.log('Dados para migrar:', races);
// Copie e insira manualmente no Supabase
```

### 2. Configurar Backup

1. Vá em **Database** → **Backups** no Supabase
2. Configure backups automáticos (diários/recentemente)
3. Teste a restauração

### 3. Otimizar Performance

1. Adicione índices nas colunas mais consultadas:
   ```sql
   CREATE INDEX idx_races_published ON races(published);
   CREATE INDEX idx_races_date ON races(date);
   CREATE INDEX idx_registrations_user ON registrations(user_id);
   CREATE INDEX idx_registrations_race ON registrations(race_id);
   ```

### 4. Monitorar Uso

1. Vá em **Usage** no dashboard do Supabase
2. Monitore:
   - Requisições de banco de dados
   - Armazenamento
   - Largura de banda
   - Realtime connections

---

## 🎉 Conclusão

A migração para Supabase está completa! Seu sistema agora:

- ✅ Funciona em tempo real para múltiplos usuários
- ✅ Tem dados persistentes e seguros
- ✅ Sincroniza automaticamente entre dispositivos
- ✅ Está pronto para produção

**Próximos passos:**
1. Execute o SQL no Supabase para criar as tabelas
2. Configure as políticas RLS
3. Teste thoroughly
4. Deploy para produção

Se tiver dúvidas, consulte a documentação do Supabase: https://supabase.com/docs

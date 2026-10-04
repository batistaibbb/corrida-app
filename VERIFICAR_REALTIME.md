# 🔍 Como Verificar se o Realtime está Funcionando

## ✅ Método 1: Verificar no Dashboard do Supabase

### Passo 1: Acessar a seção Realtime

1. Acesse: https://supabase.com/dashboard/project/pfrxuxiohxwhtcxvjnbd
2. No menu lateral, clique em **"Database"**
3. Clique na aba **"Replication"**

### Passo 2: Verificar Tabelas Publicadas

Você deve ver as seguintes tabelas com o switch **ativado** (verde):

- ✅ `races`
- ✅ `registrations`
- ✅ `payments`

**Se não estiverem ativadas:**
1. Clique no switch ao lado de cada tabela
2. Confirme a ativação

### Passo 3: Verificar REPLICA IDENTITY

Execute no **SQL Editor**:

```sql
SELECT 
  tablename,
  replicaidentity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('races', 'registrations', 'payments');
```

**Resultado esperado:**
```
tablename        | replicaidentity
-----------------+----------------
races            | f (FULL)
registrations    | f (FULL)
payments         | f (FULL)
```

**Se não estiver FULL:**
```sql
ALTER TABLE races REPLICA IDENTITY FULL;
ALTER TABLE registrations REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
```

---

## ✅ Método 2: Testar na Aplicação

### Passo 1: Abrir o Console do Navegador

1. Acesse o site: https://corrida-app-sooty.vercel.app/
2. Pressione **F12** para abrir o DevTools
3. Vá na aba **"Console"**

### Passo 2: Verificar Mensagens de Conexão

Você deve ver mensagens como:

```
🔍 Supabase Config: { url: "✅ Configurado", key: "✅ Configurado" }
🔍 Supabase Status: { client: "✅ Criado", demoMode: "✅ MODO PRODUÇÃO" }
```

### Passo 3: Testar Mudanças em Tempo Real

**Teste A: Criar Evento**

1. Abra o site em **DOIS navegadores diferentes** (ex: Chrome e Firefox)
   - Navegador 1: https://corrida-app-sooty.vercel.app/
   - Navegador 2: https://corrida-app-sooty.vercel.app/

2. No **Navegador 1**:
   - Faça login como admin (`admin@smartbrasilticket.com.br` / `1Corintios10.31`)
   - Vá em "Eventos" → "Novo Evento"
   - Crie um evento de teste

3. No **Navegador 2**:
   - Faça login como usuário comum
   - Vá para a página inicial
   - **OBSERVE**: O novo evento deve aparecer **automaticamente** em 1-2 segundos

4. No **Console** do Navegador 2, você deve ver:
   ```
   🔄 Mudança detectada em races - recarregando...
   ```

**Teste B: Alterar Status**

1. No **Navegador 1** (admin):
   - Vá em "Eventos"
   - Clique no ícone de **olho** para despublicar um evento

2. No **Navegador 2** (usuário):
   - **OBSERVE**: O evento deve desaparecer **automaticamente**

3. No **Console** do Navegador 2:
   ```
   🔄 Mudança detectada em races - recarregando...
   ```

**Teste C: Inscrição**

1. No **Navegador 2** (usuário):
   - Escolha um evento e faça inscrição
   - Complete o pagamento

2. No **Navegador 1** (admin):
   - Vá em "Inscrições"
   - **OBSERVE**: A nova inscrição deve aparecer **automaticamente**

3. No **Console** do Navegador 1:
   ```
   🔄 Mudança detectada em registrations - recarregando...
   ```

---

## ✅ Método 3: Verificar Logs no Supabase

### Passo 1: Acessar Logs

1. No dashboard do Supabase, clique em **"Logs"** no menu lateral
2. Clique em **"API Logs"** ou **"Database Logs"**

### Passo 2: Filtrar por Realtime

Procure por logs com:
- **Type**: `realtime`
- **Status**: `200` ou `201`

### Passo 3: Testar Mudança

1. Faça uma alteração na aplicação (criar evento, inscrição, etc.)
2. Volte para os logs do Supabase
3. Você deve ver novos logs de Realtime

---

## ✅ Método 4: Teste Direto no SQL Editor

### Passo 1: Abrir SQL Editor

1. No dashboard do Supabase, clique em **"SQL Editor"**
2. Clique em **"New Query"**

### Passo 2: Executar Teste de Inserção

```sql
-- Inserir evento de teste
INSERT INTO races (
  name,
  date,
  time,
  location,
  city,
  state,
  image_url,
  description,
  organizer_name,
  max_participants,
  category,
  sport,
  published,
  registration_status,
  distances
) VALUES (
  'Evento Teste Realtime',
  '2026-12-31',
  '10:00',
  'Local Teste',
  'São Paulo',
  'SP',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop',
  'Evento para testar Realtime',
  'Organizador Teste',
  100,
  'Teste',
  'corrida',
  true,
  'upcoming',
  '[{"km": 5, "price": 100}]'
) RETURNING id, name, created_at;
```

### Passo 3: Verificar na Aplicação

1. Abra o site em outro navegador
2. **OBSERVE**: O "Evento Teste Realtime" deve aparecer **automaticamente**
3. Se aparecer, o Realtime está funcionando! ✅

### Passo 4: Limpar Teste

```sql
-- Remover evento de teste
DELETE FROM races WHERE name = 'Evento Teste Realtime';
```

---

## 🐛 Troubleshooting

### Problema: Realtime não está funcionando

**Sintoma:** Mudanças não aparecem automaticamente em outros navegadores

**Soluções:**

1. **Verificar se Realtime está habilitado:**
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
   
   Se não retornar as tabelas:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE races;
   ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
   ALTER PUBLICATION supabase_realtime ADD TABLE payments;
   ```

2. **Verificar REPLICA IDENTITY:**
   ```sql
   SELECT tablename, replicaidentity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('races', 'registrations', 'payments');
   ```
   
   Se não estiver FULL:
   ```sql
   ALTER TABLE races REPLICA IDENTITY FULL;
   ALTER TABLE registrations REPLICA IDENTITY FULL;
   ALTER TABLE payments REPLICA IDENTITY FULL;
   ```

3. **Verificar Console do Navegador:**
   - Abra F12 → Console
   - Procure por erros relacionados a WebSocket
   - Procure por mensagens de "Mudança detectada"

4. **Verificar Network:**
   - Abra F12 → Network
   - Filtre por "WS" (WebSocket)
   - Deve haver uma conexão WebSocket ativa para o Supabase

5. **Recarregar a Página:**
   - Pressione Ctrl+F5 (Windows) ou Cmd+Shift+R (Mac)
   - Isso força o recarregamento completo

---

## ✅ Checklist Final

- [ ] Tabelas estão publicadas no Realtime (Database → Replication)
- [ ] REPLICA IDENTITY está FULL para todas as tabelas
- [ ] Console mostra mensagens de "Mudança detectada"
- [ ] Mudanças aparecem automaticamente em outros navegadores
- [ ] Network mostra conexão WebSocket ativa
- [ ] Logs do Supabase mostram atividade de Realtime

---

## 📞 Se Ainda Não Funcionar

### Coletar Informações

1. **Screenshot do Dashboard:**
   - Database → Replication (mostrando as tabelas)

2. **Console do Navegador:**
   - Copie todas as mensagens relacionadas a Supabase/Realtime

3. **Network Tab:**
   - Screenshot da conexão WebSocket

4. **Logs do Supabase:**
   - Database → Logs → Filtre por "realtime"

### Verificar Variáveis de Ambiente

Confirme que estas variáveis estão corretas na Vercel:

```
VITE_SUPABASE_URL=https://pfrxuxiohxwhtcxvjnbd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Testar Modo Demo

Se o Realtime não funcionar, o sistema ainda funciona em modo demo (localStorage):

1. Remova as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` da Vercel
2. Faça redeploy
3. O sistema voltará a usar localStorage

---

## 🎯 Resultado Esperado

Se o Realtime estiver funcionando corretamente:

1. ✅ Admin cria evento → Aparece para todos os usuários em 1-2 segundos
2. ✅ Admin altera status → Atualiza para todos em tempo real
3. ✅ Usuário se inscreve → Admin vê a inscrição imediatamente
4. ✅ Console mostra logs de mudanças detectadas
5. ✅ Network mostra conexão WebSocket ativa

---

**Se tudo estiver funcionando, parabéns! Seu sistema está 100% operacional com sincronização em tempo real!** 🎉

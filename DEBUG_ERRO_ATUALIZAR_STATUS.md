# Debug: Erro ao Atualizar Status

## Problema
Ao tentar editar o status de um evento, aparece: "Erro ao atualizar status. Tente novamente."

## Causas Possíveis

### 1. Políticas RLS Restritivas
As políticas de segurança podem estar bloqueando a atualização.

### 2. Estrutura da Tabela Incompatível
Os nomes das colunas no Supabase podem não corresponder ao código.

### 3. Permissões do Usuário
O usuário logado pode não ter permissão para atualizar eventos.

### 4. Dados Inválidos
Algum campo pode estar com valor inválido ou NULL.

## Passos para Debug

### Passo 1: Verificar Console do Navegador

1. Abra o site e pressione **F12**
2. Vá na aba **Console**
3. Tente editar o status de um evento
4. Copie a mensagem de erro completa

**Procure por mensagens como:**
- `Error updating race: ...`
- `PostgrestError: ...`
- `new row violates row-level security policy`

### Passo 2: Verificar Logs do Supabase

1. Acesse o dashboard do Supabase
2. Vá em **Logs** → **API Logs**
3. Filtre por **POST** ou **PATCH**
4. Procure por erros recentes

### Passo 3: Testar Atualização Manualmente no SQL

Execute no **SQL Editor** do Supabase:

```sql
-- Encontrar um evento para testar
SELECT id, name, published, registration_status 
FROM races 
LIMIT 1;
```

Copie o `id` do evento e execute:

```sql
-- Testar atualização de published
UPDATE races 
SET published = NOT published, 
    updated_at = NOW()
WHERE id = 'COLE_O_ID_AQUI';

-- Verificar se funcionou
SELECT id, name, published, registration_status, updated_at 
FROM races 
WHERE id = 'COLE_O_ID_AQUI';
```

Se funcionar no SQL mas não na aplicação, o problema é nas políticas RLS.

### Passo 4: Verificar Políticas RLS

Execute no **SQL Editor**:

```sql
-- Ver todas as políticas da tabela races
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'races';
```

### Passo 5: Corrigir Políticas RLS

Se as políticas estiverem muito restritivas, execute:

```sql
-- Remover políticas existentes
DROP POLICY IF EXISTS "Admins podem atualizar eventos" ON races;

-- Criar política mais permissiva
CREATE POLICY "Usuários autenticados podem atualizar eventos"
  ON races FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

### Passo 6: Verificar Estrutura da Tabela

Execute no **SQL Editor**:

```sql
-- Ver estrutura da tabela races
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'races'
ORDER BY ordinal_position;
```

**Colunas esperadas:**
- `id` (uuid)
- `name` (text)
- `published` (boolean)
- `registration_status` (text)
- `updated_at` (timestamptz)
- ... (outras colunas)

Se alguma coluna estiver faltando:

```sql
-- Adicionar coluna published se não existir
ALTER TABLE races 
ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE;

-- Adicionar coluna registration_status se não existir
ALTER TABLE races 
ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'upcoming';
```

### Passo 7: Verificar Permissões do Usuário

Execute no **SQL Editor**:

```sql
-- Ver o usuário atual
SELECT auth.uid();

-- Ver o perfil do usuário
SELECT id, email, role 
FROM profiles 
WHERE id = auth.uid();
```

Se o usuário não tiver perfil:

```sql
-- Criar perfil para o usuário atual
INSERT INTO profiles (id, email, role)
VALUES (
  auth.uid(),
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  'admin'
);
```

### Passo 8: Testar com Logs Detalhados

Adicione logs temporários no código para ver o erro exato.

No arquivo `src/contexts/DataContext.tsx`, na função `updateRace`:

```typescript
const updateRace = async (id: string,  Partial<Race>) => {
  console.log('🔄 Tentando atualizar evento:', { id, data });
  
  if (!isDemoMode && supabase) {
    const updateData: any = { updated_at: new Date().toISOString() };
    
    // ... mapeamento de campos ...
    
    console.log('📤 Dados para atualizar:', updateData);
    
    const { data, error } = await supabase
      .from('races')
      .update(updateData)
      .eq('id', id)
      .select();
    
    console.log('📥 Resposta do Supabase:', { data, error });
    
    if (error) {
      console.error('❌ Erro ao atualizar evento:', error);
      throw error;
    }
    
    await loadRaces();
  }
};
```

Depois teste novamente e copie os logs do console.

## Soluções Comuns

### Solução 1: Política RLS Muito Restritiva

**Problema:** A política exige que o usuário seja admin, mas o perfil não tem role = 'admin'

**Solução:**
```sql
-- Verificar perfil do usuário
SELECT id, email, role FROM profiles WHERE id = auth.uid();

-- Se não tiver role 'admin', atualizar
UPDATE profiles 
SET role = 'admin' 
WHERE id = auth.uid();
```

### Solução 2: Coluna Não Existe

**Problema:** A tabela não tem a coluna `published` ou `registration_status`

**Solução:**
```sql
ALTER TABLE races 
ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'upcoming';
```

### Solução 3: Usuário Não Autenticado

**Problema:** O usuário não está logado ou a sessão expirou

**Solução:**
1. Faça logout
2. Faça login novamente
3. Tente editar o status

### Solução 4: Conflito de Nomes de Coluna

**Problema:** O código usa `published` mas a tabela tem `is_published`

**Solução:** Verificar a estrutura da tabela e ajustar o código ou a tabela.

## Teste Final

Após aplicar as correções:

1. Faça logout e login novamente
2. Abra o Console (F12)
3. Tente editar o status
4. Verifique os logs no console
5. O status deve mudar sem erros

## Se Ainda Não Funcionar

Me envie:

1. **Logs do Console do navegador** (F12 → Console)
2. **Logs do Supabase** (Dashboard → Logs → API Logs)
3. **Resultado da query** de verificação de políticas RLS
4. **Estrutura da tabela** races

Com essas informações, posso identificar o problema exato e fornecer a solução específica.

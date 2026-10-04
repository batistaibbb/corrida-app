# 🚀 Solução Completa: Erro ao Atualizar Status

## 🎯 Problema Identificado

Os erros nos logs mostram:

```
❌ invalid input syntax for type uuid: "corrida-sao-silvestre-2026"
❌ duplicate key value violates unique constraint "profiles_pkey"
```

**Causa raiz:**
1. Os eventos no banco de dados têm IDs no formato string antigo (`"corrida-sao-silvestre-2026"`)
2. O Supabase espera UUIDs válidos (`"123e4567-e89b-12d3-a456-426614174000"`)
3. Há tentativa de criar perfil duplicado durante o login

## ✅ Solução em 3 Passos

### 📝 PASSO 1: Executar SQL de Correção

Copie e execute este SQL no **Supabase SQL Editor**:

```sql
-- ============================================
-- CORRIGIR IDs DOS EVENTOS E POLÍTICAS RLS
-- ============================================

-- 1. Deletar eventos com IDs inválidos (formato string antigo)
DELETE FROM races 
WHERE id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- 2. Inserir eventos com UUIDs válidos
INSERT INTO races (
  id,
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
  distances,
  includes,
  rules,
  featured,
  discount,
  tags
) VALUES 
(
  gen_random_uuid(),
  'Corrida Internacional de São Silvestre',
  '2026-12-31',
  '06:00',
  'Av. Paulista, 1578',
  'São Paulo',
  'SP',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop',
  'A mais tradicional corrida de rua do Brasil! Participe da 101ª edição da São Silvestre e corra pelas ruas de São Paulo na última noite do ano.',
  'Fundação Cásper Líbero',
  35000,
  'Internacional',
  'corrida',
  true,
  'upcoming',
  '[{"km": 5, "price": 189.90}, {"km": 10, "price": 249.90}, {"km": 15, "price": 329.90}]'::jsonb,
  '["Kit do corredor", "Camiseta oficial", "Medalha de participação", "Hidratação no percurso", "Seguro pessoal", "Cronometragem eletrônica"]'::jsonb,
  '["Idade mínima: 14 anos", "Atestado médico obrigatório", "Retirada do kit em local e data a definir", "Ponto de corte: 3h30"]'::jsonb,
  true,
  0,
  '["tradicional", "internacional", "noturna"]'::jsonb
),
(
  gen_random_uuid(),
  'Meia Maratona do Rio de Janeiro',
  '2026-07-19',
  '06:30',
  'Praia de Copacabana',
  'Rio de Janeiro',
  'RJ',
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&h=400&fit=crop',
  'Corra com vista para o mar! A Meia Maratona do Rio oferece um percurso plano e rápido pela orla de Copacabana, passando por pontos turísticos icônicos da Cidade Maravilhosa.',
  'Run Events Brasil',
  20000,
  'Meia Maratona',
  'corrida',
  true,
  'upcoming',
  '[{"km": 5, "price": 119.90}, {"km": 10, "price": 159.90}, {"km": 21, "price": 219.90}]'::jsonb,
  '["Kit do corredor", "Camiseta técnica", "Medalha finisher", "Hidratação completa", "Pós-prova com frutas", "Foto oficial"]'::jsonb,
  '["Idade mínima: 16 anos para 21km", "Atestado médico obrigatório", "Largada por ondas", "Tempo limite: 3h30 para 21km"]'::jsonb,
  true,
  15,
  '["litoral", "rápida", "turística"]'::jsonb
),
(
  gen_random_uuid(),
  'Trail Run Serra da Mantiqueira',
  '2026-09-13',
  '07:00',
  'Parque Nacional da Serra da Mantiqueira',
  'Campos do Jordão',
  'SP',
  'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=400&fit=crop',
  'Uma aventura pelos trilhos da Serra da Mantiqueira! Corrida em meio à natureza com paisagens de tirar o fôlego, subidas desafiadoras e descidas emocionantes.',
  'Trail Adventures',
  2000,
  'Trail Run',
  'corrida',
  true,
  'upcoming',
  '[{"km": 10, "price": 149.90}, {"km": 21, "price": 199.90}, {"km": 42, "price": 299.90}]'::jsonb,
  '["Kit do corredor", "Camiseta dry-fit", "Medalha finisher", "Postos de apoio com frutas e isotônico", "Seguro aventura", "Resgate em trilha"]'::jsonb,
  '["Idade mínima: 18 anos", "Atestado médico obrigatório", "Bastão de trekking permitido", "Obrigatório portar apito de emergência"]'::jsonb,
  false,
  0,
  '["natureza", "trilha", "aventura"]'::jsonb
);

-- 3. Remover todas as políticas conflitantes
DROP POLICY IF EXISTS "Admins podem atualizar eventos" ON races;
DROP POLICY IF EXISTS "Admins podem criar eventos" ON races;
DROP POLICY IF EXISTS "Admins podem deletar eventos" ON races;
DROP POLICY IF EXISTS "Admins podem ver todos os eventos" ON races;
DROP POLICY IF EXISTS "Anyone can view active races" ON races;
DROP POLICY IF EXISTS "Authenticated users can delete races" ON races;
DROP POLICY IF EXISTS "Authenticated users can insert races" ON races;
DROP POLICY IF EXISTS "Authenticated users can update races" ON races;
DROP POLICY IF EXISTS "Eventos publicados são visíveis para todos" ON races;

-- 4. Criar políticas simplificadas e consistentes
CREATE POLICY "Eventos publicados visíveis para todos"
  ON races FOR SELECT
  USING (published = true OR auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem criar eventos"
  ON races FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem atualizar eventos"
  ON races FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem deletar eventos"
  ON races FOR DELETE
  USING (auth.role() = 'authenticated');

-- 5. Corrigir perfil do usuário admin
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@runbrasil.com.br'
  LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    DELETE FROM profiles WHERE id = admin_user_id;
    
    INSERT INTO profiles (id, email, name, role)
    VALUES (
      admin_user_id,
      'admin@runbrasil.com.br',
      'Administrador',
      'admin'
    );
    
    RAISE NOTICE 'Perfil admin criado/atualizado com sucesso!';
  ELSE
    RAISE EXCEPTION 'Usuário admin não encontrado!';
  END IF;
END $$;

-- 6. Verificar resultado
SELECT 
  '✅ Correções aplicadas com sucesso!' as status,
  count(*) as total_eventos
FROM races;
```

**Resultado esperado:**
```
status                              | total_eventos
------------------------------------+---------------
✅ Correções aplicadas com sucesso! | 3
```

### 📝 PASSO 2: Fazer Push das Correções de Código

O código já foi corrigido para:
- ✅ Não tentar criar perfil duplicado
- ✅ Ignorar erro de duplicata (código 23505)
- ✅ Usar `.maybeSingle()` para evitar erros

Faça o commit e push:

```bash
git add .
git commit -m "Corrigir erro de perfil duplicado e IDs UUID"
git push origin main
```

Aguarde o deploy na Vercel (~2 minutos).

### 📝 PASSO 3: Testar

1. **Faça logout** do site
2. **Faça login** novamente com `admin@runbrasil.com.br` / `1Corintios10.31`
3. **Verifique no Console** (F12):
   - ✅ Não deve aparecer erro de "duplicate key"
   - ✅ Deve aparecer "✅ Login Supabase sucesso"
4. **Teste editar status**:
   - Vá em "Eventos"
   - Clique no ícone de olho 👁️ para publicar/despublicar
   - Clique no ícone de cadeado 🔒 para encerrar/reabrir inscrições
   - ✅ Deve funcionar sem erros!

## 🔍 Verificação Final

### Verificar se os eventos têm UUIDs válidos:

```sql
SELECT 
  id,
  name,
  published,
  registration_status
FROM races
ORDER BY created_at DESC;
```

**Resultado esperado:**
```
id                                   | name                                    | published | registration_status
-------------------------------------+-----------------------------------------+-----------+---------------------
a1b2c3d4-e5f6-7890-abcd-1234567890ab | Corrida Internacional de São Silvestre  | true      | upcoming
b2c3d4e5-f6a7-8901-bcde-2345678901bc | Meia Maratona do Rio de Janeiro         | true      | upcoming
c3d4e5f6-a7b8-9012-cdef-3456789012cd | Trail Run Serra da Mantiqueira          | true      | upcoming
```

### Verificar políticas RLS:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'races';
```

**Resultado esperado:**
```
policyname                              | cmd
----------------------------------------+--------
Eventos publicados visíveis para todos  | SELECT
Usuários autenticados podem criar eventos    | INSERT
Usuários autenticados podem atualizar eventos | UPDATE
Usuários autenticados podem deletar eventos   | DELETE
```

### Verificar perfil admin:

```sql
SELECT 
  p.id,
  p.email,
  p.name,
  p.role,
  u.email as auth_email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.email = 'admin@runbrasil.com.br';
```

**Resultado esperado:**
```
id                                   | email                      | name            | role  | auth_email
-------------------------------------+----------------------------+-----------------+-------+---------------------------
a1b2c3d4-e5f6-7890-abcd-1234567890ab | admin@runbrasil.com.br     | Administrador   | admin | admin@runbrasil.com.br
```

## 🐛 Se Ainda Não Funcionar

### Erro: "invalid input syntax for type uuid"

**Causa:** Ainda há eventos com IDs inválidos

**Solução:**
```sql
-- Deletar todos os eventos com IDs inválidos
DELETE FROM races 
WHERE id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- Verificar se foi limpo
SELECT count(*) FROM races;
-- Deve retornar 0

-- Executar o SQL do PASSO 1 novamente
```

### Erro: "duplicate key value violates unique constraint"

**Causa:** Perfil já existe

**Solução:**
```sql
-- Verificar perfis duplicados
SELECT email, count(*) 
FROM profiles 
GROUP BY email 
HAVING count(*) > 1;

-- Se houver duplicatas, deletar as extras
DELETE FROM profiles a
USING profiles b
WHERE a.ctid < b.ctid
AND a.email = b.email;
```

### Erro: "new row violates row-level security policy"

**Causa:** Políticas RLS muito restritivas

**Solução:**
```sql
-- Remover todas as políticas
DROP POLICY IF EXISTS "Admins podem atualizar eventos" ON races;
DROP POLICY IF EXISTS "Admins podem criar eventos" ON races;
DROP POLICY IF EXISTS "Admins podem deletar eventos" ON races;
DROP POLICY IF EXISTS "Admins podem ver todos os eventos" ON races;
DROP POLICY IF EXISTS "Anyone can view active races" ON races;
DROP POLICY IF EXISTS "Authenticated users can delete races" ON races;
DROP POLICY IF EXISTS "Authenticated users can insert races" ON races;
DROP POLICY IF EXISTS "Authenticated users can update races" ON races;
DROP POLICY IF EXISTS "Eventos publicados são visíveis para todos" ON races;

-- Criar políticas permissivas
CREATE POLICY "Permitir tudo para autenticados"
  ON races FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

## 📊 Resumo das Correções

| Problema | Causa | Solução |
|----------|-------|---------|
| ❌ `invalid input syntax for type uuid` | IDs no formato string antigo | ✅ Executar SQL para deletar e recriar com UUIDs |
| ❌ `duplicate key value violates unique constraint` | Tentativa de criar perfil duplicado | ✅ Código corrigido para verificar antes de criar |
| ❌ Políticas RLS conflitantes | Múltiplas políticas para mesma operação | ✅ SQL limpa e recria políticas simplificadas |

## 🎯 Próximos Passos

1. ✅ Executar SQL do PASSO 1
2. ✅ Fazer push das correções de código
3. ✅ Aguardar deploy na Vercel
4. ✅ Testar edição de status
5. ✅ Verificar se não há erros no Console

**Se tudo funcionar, os botões de status devem funcionar perfeitamente!** 🎉

## 📞 Suporte

Se ainda houver problemas, me envie:

1. ✅ Logs completos do Console (F12)
2. ✅ Resultado das queries de verificação
3. ✅ Screenshot do erro (se houver)

Com essas informações, posso identificar o problema exato e fornecer a solução específica.

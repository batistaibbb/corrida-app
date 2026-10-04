-- ============================================
-- CORRIGIR IDs DOS EVENTOS E POLÍTICAS RLS
-- ============================================
-- Execute este SQL no Supabase SQL Editor

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
-- Encontrar o usuário admin
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@runbrasil.com.br'
  LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Deletar perfil existente se houver
    DELETE FROM profiles WHERE id = admin_user_id;
    
    -- Criar perfil admin
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

-- 7. Mostrar eventos criados
SELECT 
  id,
  name,
  published,
  registration_status,
  created_at
FROM races
ORDER BY created_at DESC;

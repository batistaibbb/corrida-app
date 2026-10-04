-- ============================================
-- ADICIONAR SUPORTE A KITS E TAMANHOS DE CAMISA
-- ============================================
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna kits na tabela races
ALTER TABLE races 
ADD COLUMN IF NOT EXISTS kits JSONB DEFAULT '[]'::jsonb;

-- 2. Adicionar coluna shirt_sizes na tabela races
ALTER TABLE races 
ADD COLUMN IF NOT EXISTS shirt_sizes JSONB DEFAULT '["PP", "P", "M", "G", "GG", "XGG"]'::jsonb;

-- 3. Adicionar coluna kit_id na tabela registrations
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS kit_id TEXT;

-- 4. Adicionar coluna kit_name na tabela registrations
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS kit_name TEXT;

-- 5. Atualizar o primeiro evento oficial com kits
UPDATE races
SET 
  kits = '[
    {
      "id": "kit-1",
      "name": "Kit 1 - Completo",
      "description": "Medalha + Camisa + Viseira",
      "price": 70.00,
      "image": "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=400&h=300&fit=crop",
      "includes": ["Medalha de participação", "Camisa exclusiva", "Viseira personalizada"],
      "distance": 4
    },
    {
      "id": "kit-2",
      "name": "Kit 2 - Medalha + Camisa",
      "description": "Medalha + Camisa",
      "price": 50.00,
      "image": "https://images.unsplash.com/photo-1579120399252-4b95  9c3d4d7d?w=400&h=300&fit=crop",
      "includes": ["Medalha de participação", "Camisa exclusiva"],
      "distance": 4
    },
    {
      "id": "kit-3",
      "name": "Kit 3 - Medalha + Viseira",
      "description": "Medalha + Viseira",
      "price": 35.00,
      "image": "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=300&fit=crop",
      "includes": ["Medalha de participação", "Viseira personalizada"],
      "distance": 0
    }
  ]'::jsonb,
  shirt_sizes = '["PP", "P", "M", "G", "GG", "XGG"]'::jsonb
WHERE name LIKE '%Mulheres em Movimento%';

-- 6. Verificar se foi atualizado
SELECT 
  name,
  kits::jsonb,
  shirt_sizes::jsonb
FROM races
WHERE name LIKE '%Mulheres em Movimento%';

-- 7. Verificar estrutura das tabelas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'races' 
AND column_name IN ('kits', 'shirt_sizes');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'registrations' 
AND column_name IN ('kit_id', 'kit_name');

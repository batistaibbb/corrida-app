-- ============================================
-- ADICIONAR SUPORTE A PDFs E MAPAS
-- ============================================
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna regulation_pdf na tabela races
ALTER TABLE races 
ADD COLUMN IF NOT EXISTS regulation_pdf TEXT;

-- 2. Adicionar coluna route_map na tabela races
ALTER TABLE races 
ADD COLUMN IF NOT EXISTS route_map TEXT;

-- 3. Adicionar coluna distance_id na tabela registrations
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS distance_id TEXT;

-- 4. Atualizar estrutura da coluna distances para suportar nomes e descrições
-- (A coluna já existe como JSONB, então apenas documentamos a nova estrutura)

-- 5. Criar bucket para documentos PDF (se ainda não existir)
-- Isso deve ser feito via Dashboard do Supabase:
-- Storage → New Bucket → Name: "event-documents" → Public: true

-- 6. Verificar se as colunas foram criadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'races' 
AND column_name IN ('regulation_pdf', 'route_map');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'registrations' 
AND column_name = 'distance_id';

-- 7. Estrutura esperada para distances (JSONB):
/*
[
  {
    "km": 5,
    "price": 100.00,
    "name": "Caminhada",
    "description": "Percurso plano e acessível",
    "kitId": "kit-1" (opcional - vincula a um kit específico)
  },
  {
    "km": 10,
    "price": 150.00,
    "name": "Corrida",
    "description": "Percurso desafiador com subidas"
  }
]
*/

-- 8. Estrutura esperada para kits (JSONB):
/*
[
  {
    "id": "kit-1",
    "name": "Kit Básico",
    "description": "Camisa + Medalha",
    "price": 100.00,
    "image": "https://...",
    "includes": ["Camisa", "Medalha"],
    "distance": 5,
    "distanceIds": ["dist-1"] (opcional - vincula a distâncias específicas)
  }
]
*/

SELECT '✅ Colunas adicionadas com sucesso!' as status;

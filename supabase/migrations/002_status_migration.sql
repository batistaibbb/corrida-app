-- ============================================
-- MIGRAÇÃO: Novo Sistema de Status
-- ============================================
-- Executar no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar novos campos
ALTER TABLE races ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;
ALTER TABLE races ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'upcoming' 
  CHECK (registration_status IN ('upcoming', 'closed', 'finished'));

-- 2. Migrar dados existentes
-- Converter status antigo para os novos campos
UPDATE races SET 
  published = CASE 
    WHEN status IN ('published', 'open', 'closed') THEN true
    ELSE false
  END,
  registration_status = CASE 
    WHEN status = 'open' THEN 'upcoming'
    WHEN status = 'closed' THEN 'closed'
    WHEN status = 'finished' THEN 'finished'
    ELSE 'upcoming'
  END
WHERE published IS NULL OR registration_status IS NULL;

-- 3. Remover campo antigo (opcional - descomente após validar)
-- ALTER TABLE races DROP COLUMN IF EXISTS status;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_races_published ON races(published);
CREATE INDEX IF NOT EXISTS idx_races_registration_status ON races(registration_status);

-- 5. Atualizar políticas RLS (se necessário)
-- As políticas existentes já devem funcionar, mas você pode ajustar se precisar

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================

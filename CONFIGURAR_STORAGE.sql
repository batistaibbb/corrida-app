-- ============================================
-- CONFIGURAR STORAGE DO SUPABASE
-- ============================================
-- Execute este SQL no Supabase SQL Editor

-- ============================================
-- 1. CRIAR BUCKETS (se ainda não existirem)
-- ============================================

-- Bucket para imagens
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para documentos PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-documents',
  'event-documents',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. REMOVER POLÍTICAS ANTIGAS (se existirem)
-- ============================================

-- Remover políticas antigas do bucket event-images
DROP POLICY IF EXISTS "Permitir upload de imagens para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública de imagens" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de imagens para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de imagens para autenticados" ON storage.objects;

-- Remover políticas antigas do bucket event-documents
DROP POLICY IF EXISTS "Permitir upload de documentos para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de documentos para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de documentos para autenticados" ON storage.objects;

-- ============================================
-- 3. CRIAR POLÍTICAS DE SEGURANÇA
-- ============================================

-- Bucket: event-images
-- Permitir upload para usuários autenticados
CREATE POLICY "Permitir upload de imagens para autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

-- Permitir leitura pública de imagens
CREATE POLICY "Permitir leitura pública de imagens"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');

-- Permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização de imagens para autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images');

-- Permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão de imagens para autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images');

-- Bucket: event-documents
-- Permitir upload de PDFs para usuários autenticados
CREATE POLICY "Permitir upload de documentos para autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-documents');

-- Permitir leitura pública de documentos
CREATE POLICY "Permitir leitura pública de documentos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-documents');

-- Permitir atualização de documentos para usuários autenticados
CREATE POLICY "Permitir atualização de documentos para autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-documents');

-- Permitir exclusão de documentos para usuários autenticados
CREATE POLICY "Permitir exclusão de documentos para autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-documents');

-- ============================================
-- 4. VERIFICAÇÃO
-- ============================================

-- Verificar se os buckets existem
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE name IN ('event-images', 'event-documents');

-- Verificar políticas
SELECT 
  bucket_id,
  name,
  permissive,
  roles,
  cmd
FROM storage.policies
WHERE bucket_id IN ('event-images', 'event-documents')
ORDER BY bucket_id, name;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================

/*
Buckets:
- event-images: public=true, file_size_limit=5242880
- event-documents: public=true, file_size_limit=10485760

Políticas (8 total):
- event-images: INSERT, SELECT, UPDATE, DELETE
- event-documents: INSERT, SELECT, UPDATE, DELETE
*/

SELECT '✅ Storage configurado com sucesso!' as status;

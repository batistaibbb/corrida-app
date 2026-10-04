-- ============================================
-- CONFIGURAR STORAGE DO SUPABASE (SIMPLIFICADO)
-- ============================================
-- Execute este SQL no Supabase SQL Editor

-- ============================================
-- 1. CRIAR BUCKETS
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
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- Bucket para documentos PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-documents',
  'event-documents',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];

-- ============================================
-- 2. CRIAR POLÍTICAS DE SEGURANÇA
-- ============================================

-- Bucket: event-images
CREATE POLICY "Permitir upload de imagens para autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Permitir leitura pública de imagens"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');

CREATE POLICY "Permitir atualização de imagens para autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images');

CREATE POLICY "Permitir exclusão de imagens para autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images');

-- Bucket: event-documents
CREATE POLICY "Permitir upload de documentos para autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-documents');

CREATE POLICY "Permitir leitura pública de documentos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-documents');

CREATE POLICY "Permitir atualização de documentos para autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-documents');

CREATE POLICY "Permitir exclusão de documentos para autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-documents');

-- ============================================
-- 3. VERIFICAÇÃO SIMPLIFICADA
-- ============================================

-- Verificar se os buckets existem
SELECT 
  name,
  public,
  file_size_limit
FROM storage.buckets 
WHERE name IN ('event-images', 'event-documents');

SELECT '✅ Storage configurado com sucesso!' as status;

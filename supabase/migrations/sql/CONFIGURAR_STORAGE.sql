-- ============================================
-- CONFIGURAR STORAGE DO SUPABASE
-- ============================================
-- Execute este SQL no Supabase SQL Editor

-- 1. Criar bucket para imagens
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-documents', 'event-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas para event-images
CREATE POLICY "Imagens são visualizadas publicamente"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Usuários autenticados podem fazer upload de imagens"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem atualizar suas imagens"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem deletar suas imagens"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');

-- 4. Políticas para event-documents
CREATE POLICY "Documentos são visualizados publicamente"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-documents');

CREATE POLICY "Usuários autenticados podem fazer upload de documentos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem atualizar seus documentos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem deletar seus documentos"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-documents' AND auth.role() = 'authenticated');

-- 5. Verificar configuração
SELECT name, public FROM storage.buckets WHERE name IN ('event-images', 'event-documents');

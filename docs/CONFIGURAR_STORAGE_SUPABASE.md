# 🔧 Configuração do Storage no Supabase

## ⚠️ Erro ao Fazer Upload de Imagem?

Se você está vendo erros como:
- "bucket not found"
- "new row violates row-level security"
- "Erro ao fazer upload da imagem"

Siga este guia para configurar corretamente o Storage do Supabase.

---

## 📦 Passo 1: Criar Buckets

### **Bucket 1: event-images** (para imagens)

1. Acesse o Dashboard do Supabase
2. Vá em **Storage** (menu lateral esquerdo)
3. Clique em **"New bucket"**
4. Configure:
   - **Name:** `event-images`
   - **Public bucket:** ✅ **MARCADO**
   - **File size limit:** `5MB`
   - **Allowed MIME types:** `image/png, image/jpeg, image/webp`
5. Clique em **"Create bucket"**

### **Bucket 2: event-documents** (para PDFs)

1. Clique em **"New bucket"** novamente
2. Configure:
   - **Name:** `event-documents`
   - **Public bucket:** ✅ **MARCADO**
   - **File size limit:** `10MB`
   - **Allowed MIME types:** `application/pdf`
3. Clique em **"Create bucket"**

---

## 🔒 Passo 2: Configurar Políticas de Segurança

Execute este SQL no **SQL Editor** do Supabase:

```sql
-- ============================================
-- POLÍTICAS DE SEGURANÇA PARA STORAGE
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
-- VERIFICAÇÃO
-- ============================================

-- Verificar se os buckets existem
SELECT name, public 
FROM storage.buckets 
WHERE name IN ('event-images', 'event-documents');

-- Verificar políticas
SELECT bucket_id, name, permissive
FROM storage.policies
WHERE bucket_id IN ('event-images', 'event-documents');
```

---

## 🎨 Passo 3: Testar o Upload

### **Opção A: Upload Automático (Recomendado)**

1. Acesse o site: https://smartbrasilticket.vercel.app/
2. Faça login como admin
3. Vá em "Eventos" → "Novo Evento"
4. Na seção "Imagem Principal", clique na área pontilhada
5. Selecione uma imagem
6. ✅ Deve fazer upload automaticamente

### **Opção B: URL Manual (Fallback)**

Se o upload automático falhar:

1. Na seção "Imagem Principal", clique em **"Inserir URL manualmente"**
2. Cole uma URL de imagem, por exemplo:
   ```
   https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&h=630&fit=crop
   ```
3. Clique em **"Aplicar"**
4. ✅ A imagem deve aparecer

---

## 🖼️ URLs de Imagens Gratuitas (Para Testar)

### **Unsplash** (Recomendado)
```
https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&h=630&fit=crop
https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200&h=630&fit=crop
https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&h=630&fit=crop
https://images.unsplash.com/photo-1517836357463-d25d5d3de3f5?w=1200&h=630&fit=crop
```

### **Pexels**
```
https://images.pexels.com/photos/1433052/pexels-photo-1433052.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop
```

### **Pixabay**
```
https://cdn.pixabay.com/photo/2016/11/29/05/45/astronomy-1868726_1280.jpg
```

---

## 📄 URLs de PDFs Gratuitos (Para Testar)

### **Google Drive**
1. Faça upload do PDF no Google Drive
2. Clique com botão direito → "Compartilhar"
3. Mude para "Qualquer pessoa com o link"
4. Copie o link e converta para download direto:
   ```
   https://drive.google.com/uc?export=download&id=SEU_ID_AQUI
   ```

### **Dropbox**
1. Faça upload do PDF no Dropbox
2. Clique em "Compartilhar" → "Criar link"
3. Copie o link e mude `dl=0` para `dl=1`:
   ```
   https://www.dropbox.com/s/SEU_LINK/regulamento.pdf?dl=1
   ```

---

## 🐛 Troubleshooting

### **Erro: "bucket not found"**

**Causa:** O bucket não foi criado no Supabase

**Solução:**
1. Acesse Supabase Dashboard → Storage
2. Crie os buckets `event-images` e `event-documents`
3. Marque como **Public**
4. Tente novamente

### **Erro: "new row violates row-level security"**

**Causa:** Políticas de segurança não foram configuradas

**Solução:**
1. Execute o SQL do **Passo 2** acima
2. Verifique se as políticas foram criadas
3. Tente novamente

### **Erro: "The resource already exists"**

**Causa:** Arquivo com mesmo nome já existe

**Solução:**
1. O componente já gera nomes únicos automaticamente
2. Se persistir, tente outro arquivo
3. Ou use a opção "Inserir URL manualmente"

### **Upload muito lento**

**Causa:** Arquivo muito grande ou conexão lenta

**Solução:**
1. Comprima a imagem antes de fazer upload
2. Use ferramentas como:
   - [TinyPNG](https://tinypng.com/)
   - [Squoosh](https://squoosh.app/)
3. Ou use a opção "Inserir URL manualmente"

---

## ✅ Checklist de Configuração

- [ ] Bucket `event-images` criado
- [ ] Bucket `event-images` marcado como **Public**
- [ ] Bucket `event-documents` criado
- [ ] Bucket `event-documents` marcado como **Public**
- [ ] Políticas de segurança executadas (SQL)
- [ ] Upload de imagem testado com sucesso
- [ ] Upload de PDF testado com sucesso
- [ ] URLs manuais funcionando

---

## 📞 Suporte

Se ainda tiver problemas:

1. **Verifique o Console do navegador** (F12 → Console)
2. **Copie a mensagem de erro completa**
3. **Verifique os logs no Supabase** (Logs → API Logs)
4. **Me envie as informações** para diagnóstico

---

## 🎯 Resultado Esperado

Após configurar corretamente:

✅ Upload de imagens funciona automaticamente
✅ Upload de PDFs funciona automaticamente
✅ Fallback para URL manual disponível
✅ Mensagens de erro claras e específicas
✅ Instruções de configuração visíveis quando necessário

**O sistema está pronto para uso!** 🚀

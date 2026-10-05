-- 008: upload/alteração/exclusão nos buckets de eventos somente para admin; leitura continua pública.
drop policy if exists "Usuários autenticados podem fazer upload de imagens" on storage.objects;
drop policy if exists "Usuários podem atualizar suas imagens" on storage.objects;
drop policy if exists "Usuários podem deletar suas imagens" on storage.objects;
drop policy if exists "Usuários autenticados podem fazer upload de documentos" on storage.objects;
drop policy if exists "Usuários podem atualizar seus documentos" on storage.objects;
drop policy if exists "Usuários podem deletar seus documentos" on storage.objects;
drop policy if exists "Permitir upload de imagens para autenticados" on storage.objects;
drop policy if exists "Permitir atualização de imagens para autenticados" on storage.objects;
drop policy if exists "Permitir exclusão de imagens para autenticados" on storage.objects;
drop policy if exists "Permitir upload de documentos para autenticados" on storage.objects;
drop policy if exists "Permitir atualização de documentos para autenticados" on storage.objects;
drop policy if exists "Permitir exclusão de documentos para autenticados" on storage.objects;

create policy "Admin envia arquivos de eventos" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('event-images', 'event-documents') and public.is_admin());

create policy "Admin atualiza arquivos de eventos" on storage.objects
  for update to authenticated
  using (bucket_id in ('event-images', 'event-documents') and public.is_admin())
  with check (bucket_id in ('event-images', 'event-documents') and public.is_admin());

create policy "Admin exclui arquivos de eventos" on storage.objects
  for delete to authenticated
  using (bucket_id in ('event-images', 'event-documents') and public.is_admin());

-- =====================================================================
-- ListaLocal — Migração 4: Supabase Storage (imagens de produtos/lojas)
-- Bucket público para leitura; envio somente por lojistas/admins, em pasta
-- com o próprio id de usuário: product-images/<auth.uid()>/<arquivo>.
-- Limite: 5 MB; tipos: JPEG, PNG, WEBP (validado também no servidor).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "product_images_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product_images_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (public.is_lojista() or public.is_admin())
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "product_images_update_own_folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "product_images_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

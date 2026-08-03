-- ============================================================
-- KAMPÜSHAFIZA PROFİL VE TOPLULUK GÖRSELLERİ
-- Supabase Storage, dosya sınırları ve sahiplik politikaları
-- ============================================================

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists cover_url text;

alter table public.communities
  add column if not exists logo_url text;

-- Kullanıcı yalnızca kendi profil görsellerini güncelleyebilir.
grant update (avatar_url, cover_url) on table public.profiles
  to authenticated;

-- En fazla 3 MB; yalnızca güvenli web görseli türleri.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'kampus-medya',
  'kampus-medya',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Herkes profil ve topluluk görsellerini görüntüleyebilir.
drop policy if exists "Kampus medyalarini herkes gorebilir"
  on storage.objects;
create policy "Kampus medyalarini herkes gorebilir"
on storage.objects for select
using (bucket_id = 'kampus-medya');

-- Dosya yolu kullanıcının kimliğiyle başlamalıdır:
-- kullanici-id/avatar-..., kullanici-id/cover-..., kullanici-id/community-...
drop policy if exists "Kullanici kendi medyasini yukleyebilir"
  on storage.objects;
create policy "Kullanici kendi medyasini yukleyebilir"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'kampus-medya'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Kullanici kendi medyasini guncelleyebilir"
  on storage.objects;
create policy "Kullanici kendi medyasini guncelleyebilir"
on storage.objects for update to authenticated
using (
  bucket_id = 'kampus-medya'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'kampus-medya'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Kullanici kendi medyasini silebilir"
  on storage.objects;
create policy "Kullanici kendi medyasini silebilir"
on storage.objects for delete to authenticated
using (
  bucket_id = 'kampus-medya'
  and owner_id = auth.uid()::text
);

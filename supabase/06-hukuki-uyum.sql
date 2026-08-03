-- ============================================================
-- KAMPÜSHAFIZA HUKUKİ UYUM VE TOPLULUK GÜVENLİĞİ
-- Metin onayları, ayrı yurt dışı aktarım rızası, şikâyetler
-- ve kullanıcının kendi hesabını kalıcı olarak silebilmesi
-- ============================================================

-- ============================================================
-- 1. HUKUKİ ONAY KAYITLARI
-- ============================================================

alter table public.profiles
  add column if not exists legal_version text not null default '',
  add column if not exists legal_accepted_at timestamptz,
  add column if not exists cross_border_consent_at timestamptz,
  add column if not exists age_confirmed_at timestamptz;

comment on column public.profiles.legal_accepted_at is
  'Kullanım koşulları ve topluluk kurallarının kabul zamanı.';
comment on column public.profiles.cross_border_consent_at is
  'Aydınlatmadan ayrı alınan yurt dışı aktarım açık rızasının zamanı.';
comment on column public.profiles.age_confirmed_at is
  'Kullanıcının 18 yaşını doldurduğunu beyan ettiği zaman.';

-- Yeni kullanıcının kayıt ekranındaki ayrı onaylarını profile taşır.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    university,
    faculty,
    department,
    class_year,
    expertise_areas,
    role,
    legal_version,
    legal_accepted_at,
    cross_border_consent_at,
    age_confirmed_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'ad_soyad', ''),
    coalesce(
      new.raw_user_meta_data ->> 'universite',
      'Manisa Celal Bayar Üniversitesi'
    ),
    coalesce(new.raw_user_meta_data ->> 'fakulte', ''),
    coalesce(new.raw_user_meta_data ->> 'bolum', ''),
    coalesce(new.raw_user_meta_data ->> 'sinif', ''),
    case
      when jsonb_typeof(new.raw_user_meta_data -> 'bilgi_alanlari') = 'array'
      then array(
        select jsonb_array_elements_text(
          new.raw_user_meta_data -> 'bilgi_alanlari'
        )
      )
      else '{}'
    end,
    'student',
    case
      when coalesce(new.raw_user_meta_data ->> 'legal_terms_accepted', 'false') = 'true'
      then coalesce(new.raw_user_meta_data ->> 'legal_version', '')
      else ''
    end,
    case
      when coalesce(new.raw_user_meta_data ->> 'legal_terms_accepted', 'false') = 'true'
      then now()
      else null
    end,
    case
      when coalesce(new.raw_user_meta_data ->> 'cross_border_accepted', 'false') = 'true'
      then now()
      else null
    end,
    case
      when coalesce(new.raw_user_meta_data ->> 'age_confirmed', 'false') = 'true'
      then now()
      else null
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.accept_legal_terms(
  accepted_version text,
  cross_border_accepted boolean,
  age_confirmed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş yapmalısın.';
  end if;

  if accepted_version <> '2026-08-01' then
    raise exception 'Hukuki metnin güncel sürümü kabul edilmelidir.';
  end if;

  if not cross_border_accepted then
    raise exception 'Yurt dışı aktarım tercihi onaylanmadı.';
  end if;

  if not age_confirmed then
    raise exception 'Platform yalnızca 18 yaşını doldurmuş kullanıcılar içindir.';
  end if;

  update public.profiles
  set
    legal_version = accepted_version,
    legal_accepted_at = now(),
    cross_border_consent_at = now(),
    age_confirmed_at = now(),
    updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'Kullanıcı profili bulunamadı.';
  end if;
end;
$$;

revoke all on function public.accept_legal_terms(text, boolean, boolean)
  from public;
grant execute on function public.accept_legal_terms(text, boolean, boolean)
  to authenticated;

-- ============================================================
-- 2. İÇERİK ŞİKÂYETLERİ
-- ============================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null
    check (target_type in ('post', 'comment', 'community', 'profile')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  reason text not null
    check (
      reason in (
        'spam',
        'harassment',
        'copyright',
        'privacy',
        'misinformation',
        'other'
      )
    ),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'resolved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (target_type = 'post' and post_id is not null and comment_id is null and community_id is null and profile_id is null)
    or
    (target_type = 'comment' and comment_id is not null and post_id is null and community_id is null and profile_id is null)
    or
    (target_type = 'community' and community_id is not null and post_id is null and comment_id is null and profile_id is null)
    or
    (target_type = 'profile' and profile_id is not null and post_id is null and comment_id is null and community_id is null)
  )
);

create index if not exists reports_status_created_at_idx
  on public.reports(status, created_at desc);
create unique index if not exists one_post_report_per_user_idx
  on public.reports(reporter_id, post_id) where post_id is not null;
create unique index if not exists one_comment_report_per_user_idx
  on public.reports(reporter_id, comment_id) where comment_id is not null;
create unique index if not exists one_community_report_per_user_idx
  on public.reports(reporter_id, community_id) where community_id is not null;
create unique index if not exists one_profile_report_per_user_idx
  on public.reports(reporter_id, profile_id) where profile_id is not null;

alter table public.reports enable row level security;

drop policy if exists "Kullanici kendi raporunu ve moderator tum raporlari gorur"
  on public.reports;
create policy "Kullanici kendi raporunu ve moderator tum raporlari gorur"
on public.reports for select to authenticated
using (
  reporter_id = auth.uid()
  or public.current_user_can_moderate()
);

drop policy if exists "Kullanici kendi raporunu olusturabilir"
  on public.reports;
create policy "Kullanici kendi raporunu olusturabilir"
on public.reports for insert to authenticated
with check (
  reporter_id = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists "Moderator raporu sonuclandirabilir"
  on public.reports;
create policy "Moderator raporu sonuclandirabilir"
on public.reports for update to authenticated
using (public.current_user_can_moderate())
with check (
  public.current_user_can_moderate()
  and reviewed_by = auth.uid()
  and reviewed_at is not null
);

revoke all on table public.reports from anon;
revoke all on table public.reports from authenticated;
grant select, insert on table public.reports to authenticated;
grant update (status, reviewed_by, reviewed_at)
  on table public.reports to authenticated;

-- ============================================================
-- 3. KULLANICININ KENDİ HESABINI KALICI OLARAK SİLMESİ
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleting_user_id uuid := auth.uid();
begin
  if deleting_user_id is null then
    raise exception 'Bu işlem için giriş yapmalısın.';
  end if;

  -- Görseller, istemci tarafında kullanıcının yetkili Storage API isteğiyle
  -- kaldırılır. Auth kullanıcısı silinince profil ve bağlı sosyal içerikler
  -- foreign key cascade ile kaldırılır.
  delete from auth.users where id = deleting_user_id;

  if not found then
    raise exception 'Silinecek kullanıcı hesabı bulunamadı.';
  end if;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- Raporlar ekranda gerçek zamanlı güncellenebilsin.
do $$
begin
  alter publication supabase_realtime add table public.reports;
exception
  when duplicate_object then null;
end;
$$;

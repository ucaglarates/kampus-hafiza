-- ============================================================
-- 1. KULLANICI PROFİLLERİ VE GÜVENLİ ROL SİSTEMİ
-- Bu dosya Supabase SQL Editor içinde yalnızca bir kez çalıştırılır.
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  university text not null default 'Manisa Celal Bayar Üniversitesi',
  faculty text not null default '',
  department text not null default '',
  class_year text not null default '',
  expertise_areas text[] not null default '{}',
  role text not null default 'student'
    check (
      role in (
        'student',
        'assistant_moderator',
        'moderator',
        'founder'
      )
    ),
  level integer not null default 1 check (level between 1 and 5),
  xp integer not null default 0 check (xp >= 0),
  verified_contributions integer not null default 0
    check (verified_contributions >= 0),
  helpful_votes integer not null default 0 check (helpful_votes >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  verification_test_completed boolean not null default false,
  verification_test_score integer not null default 0
    check (verification_test_score between 0 and 5),
  verified_areas text[] not null default '{}',
  verification_test_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Giriş yapan öğrenciler topluluktaki profilleri görebilir.
drop policy if exists "Giris yapanlar profilleri gorebilir"
  on public.profiles;

create policy "Giris yapanlar profilleri gorebilir"
on public.profiles
for select
to authenticated
using (true);

-- Her öğrenci yalnızca kendi profil bilgilerini güncelleyebilir.
drop policy if exists "Kullanici kendi profilini guncelleyebilir"
  on public.profiles;

create policy "Kullanici kendi profilini guncelleyebilir"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Rol sütunu özellikle bu listede yoktur. Normal kullanıcı kendi
-- rolünü student değerinden moderator veya founder değerine çeviremez.
revoke all on table public.profiles from anon;
revoke insert, delete, truncate, references, trigger
  on table public.profiles from authenticated;
revoke update on table public.profiles from authenticated;

grant select on table public.profiles to authenticated;
grant update (
  full_name,
  university,
  faculty,
  department,
  class_year,
  expertise_areas,
  updated_at
) on table public.profiles to authenticated;

-- ============================================================
-- 2. YENİ KAYIT OLAN ÖĞRENCİ İÇİN OTOMATİK PROFİL
-- ============================================================

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
    role
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
      when jsonb_typeof(
        new.raw_user_meta_data -> 'bilgi_alanlari'
      ) = 'array'
      then array(
        select jsonb_array_elements_text(
          new.raw_user_meta_data -> 'bilgi_alanlari'
        )
      )
      else '{}'
    end,
    'student'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

-- ============================================================
-- 3. ÖNCEDEN KAYIT OLAN KULLANICILARI PROFİL TABLOSUNA EKLEME
-- ============================================================

insert into public.profiles (
  id,
  email,
  full_name,
  university,
  faculty,
  department,
  class_year,
  expertise_areas,
  role
)
select
  kullanici.id,
  coalesce(kullanici.email, ''),
  coalesce(kullanici.raw_user_meta_data ->> 'ad_soyad', ''),
  coalesce(
    kullanici.raw_user_meta_data ->> 'universite',
    'Manisa Celal Bayar Üniversitesi'
  ),
  coalesce(kullanici.raw_user_meta_data ->> 'fakulte', ''),
  coalesce(kullanici.raw_user_meta_data ->> 'bolum', ''),
  coalesce(kullanici.raw_user_meta_data ->> 'sinif', ''),
  case
    when jsonb_typeof(
      kullanici.raw_user_meta_data -> 'bilgi_alanlari'
    ) = 'array'
    then array(
      select jsonb_array_elements_text(
        kullanici.raw_user_meta_data -> 'bilgi_alanlari'
      )
    )
    else '{}'
  end,
  'student'
from auth.users as kullanici
on conflict (id) do nothing;

-- ============================================================
-- 4. KURUCU HESABI
-- Bu e-posta yalnızca veritabanı yöneticisi tarafından kurucu yapılır.
-- ============================================================

update public.profiles
set
  role = 'founder',
  level = 5,
  xp = 1500,
  verification_test_completed = true,
  verification_test_score = 5,
  verified_areas = expertise_areas,
  verification_test_completed_at = now(),
  updated_at = now()
where lower(email) = '2528002070@ogr.cbu.edu.tr';

-- ============================================================
-- 5. MODERATÖR YETKİSİNİ KONTROL EDEN GÜVENLİ FONKSİYON
-- Gönderi ve yorum politikalarında sonraki bölümlerde kullanılacak.
-- ============================================================

create or replace function public.current_user_is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('moderator', 'founder')
  );
$$;

revoke all on function public.current_user_is_moderator() from public;
grant execute on function public.current_user_is_moderator()
  to authenticated;

-- Moderatör yardımcıları içerik denetleme araçlarına erişebilir.
create or replace function public.current_user_can_moderate()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in (
        'assistant_moderator',
        'moderator',
        'founder'
      )
  );
$$;

revoke all on function public.current_user_can_moderate() from public;
grant execute on function public.current_user_can_moderate()
  to authenticated;

-- ============================================================
-- 6. YETKİ VERME FONKSİYONU
-- Bu fonksiyonu sadece founder rolündeki kurucu çalıştırabilir.
-- Başka bir kullanıcı founder rolüne yükseltilemez.
-- ============================================================

create or replace function public.founder_set_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'founder'
  ) then
    raise exception 'Bu işlem yalnızca kurucu tarafından yapılabilir.';
  end if;

  if new_role not in (
    'student',
    'assistant_moderator',
    'moderator'
  ) then
    raise exception 'Geçersiz kullanıcı rolü.';
  end if;

  update public.profiles
  set
    role = new_role,
    updated_at = now()
  where id = target_user_id
    and role <> 'founder';

  if not found then
    raise exception 'Kullanıcı bulunamadı veya kurucu rolü değiştirilemez.';
  end if;
end;
$$;

revoke all on function public.founder_set_user_role(uuid, text)
  from public;
grant execute on function public.founder_set_user_role(uuid, text)
  to authenticated;

-- ============================================================
-- 7. OYUNLAŞTIRILMIŞ SEVİYE SİSTEMİ
-- 1: Yeni Gelen
-- 2: Katkıcı
-- 3: Bilgi Elçisi
-- 4: Kampüs Rehberi
-- 5: Kampüs Efsanesi
-- ============================================================

create or replace function public.calculate_community_level(
  current_xp integer,
  contribution_count integer,
  helpful_count integer
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when current_xp >= 1500
      and contribution_count >= 60
      and helpful_count >= 200 then 5
    when current_xp >= 600
      and contribution_count >= 25
      and helpful_count >= 75 then 4
    when current_xp >= 200
      and contribution_count >= 10
      and helpful_count >= 20 then 3
    when current_xp >= 50
      and contribution_count >= 3 then 2
    else 1
  end;
$$;

revoke all on function public.calculate_community_level(
  integer,
  integer,
  integer
) from public;

-- Sonraki bölümde doğru katkı ve faydalı oy kaydedildiğinde bu
-- fonksiyon çalışacak ve öğrencinin seviyesini otomatik yükseltecek.
create or replace function public.refresh_community_level(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    level = greatest(
      level,
      public.calculate_community_level(
        xp,
        verified_contributions,
        helpful_votes
      )
    ),
    updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.refresh_community_level(uuid) from public;

-- Kurucu, katkılarını kontrol ettiği bir öğrenciyi isterse bir üst
-- seviyeye elle yükseltebilir. Seviye düşürme yapılamaz.
create or replace function public.founder_promote_user_level(
  target_user_id uuid,
  new_level integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'founder'
  ) then
    raise exception 'Bu işlem yalnızca kurucu tarafından yapılabilir.';
  end if;

  if new_level not between 2 and 5 then
    raise exception 'Geçersiz topluluk seviyesi.';
  end if;

  update public.profiles
  set
    level = new_level,
    updated_at = now()
  where id = target_user_id
    and role <> 'founder'
    and level < new_level;

  if not found then
    raise exception 'Kullanıcı bulunamadı veya seviye zaten daha yüksek.';
  end if;
end;
$$;

revoke all on function public.founder_promote_user_level(uuid, integer)
  from public;
grant execute on function public.founder_promote_user_level(uuid, integer)
  to authenticated;

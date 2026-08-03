-- ============================================================
-- 1. PROFİLE DOĞRULAMA TESTİ ALANLARINI EKLEME
-- ============================================================

alter table public.profiles
  add column if not exists verification_test_completed boolean
    not null default false,
  add column if not exists verification_test_score integer
    not null default 0,
  add column if not exists verified_areas text[]
    not null default '{}',
  add column if not exists verification_test_completed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_verification_test_score_check;

alter table public.profiles
  add constraint profiles_verification_test_score_check
  check (verification_test_score between 0 and 5);

-- İlgi alanları doğrudan tablo üzerinden değiştirilemez. Böylece
-- kullanıcı testi sıfırlamadan doğrulanmış alanlarını değiştiremez.
revoke update (expertise_areas)
  on table public.profiles from authenticated;

-- ============================================================
-- 2. KULLANICININ İLGİ ALANLARINI GÜVENLİ ŞEKİLDE GÜNCELLEMESİ
-- Normal öğrencinin alanı değişirse doğrulama testi sıfırlanır.
-- Kurucu hesabının 5/5 doğrulaması korunur.
-- ============================================================

create or replace function public.update_my_expertise_areas(
  selected_areas text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed_areas constant text[] := array[
    'JavaScript',
    'React',
    'TypeScript',
    'Python',
    'Java',
    'C#',
    'Algoritmalar',
    'Veri Yapıları',
    'Veritabanı',
    'Backend Geliştirme',
    'Mobil Uygulama',
    'Yapay Zekâ',
    'Siber Güvenlik',
    'Bilgisayar Ağları',
    'Staj ve Kariyer'
  ];
  current_role text;
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş yapmalısın.';
  end if;

  if selected_areas is null
    or cardinality(selected_areas) < 1
    or cardinality(selected_areas) > 5 then
    raise exception 'Bir ile beş arasında ilgi alanı seçmelisin.';
  end if;

  if not selected_areas <@ allowed_areas then
    raise exception 'Geçersiz bir ilgi alanı seçildi.';
  end if;

  if cardinality(selected_areas) <> (
    select count(distinct alan)
    from unnest(selected_areas) as alan
  ) then
    raise exception 'Aynı ilgi alanı birden fazla seçilemez.';
  end if;

  select role
  into current_role
  from public.profiles
  where id = auth.uid();

  if current_role = 'founder' then
    update public.profiles
    set
      expertise_areas = selected_areas,
      verified_areas = selected_areas,
      verification_test_completed = true,
      verification_test_score = 5,
      verification_test_completed_at = now(),
      updated_at = now()
    where id = auth.uid();
  else
    update public.profiles
    set
      expertise_areas = selected_areas,
      verified_areas = '{}',
      verification_test_completed = false,
      verification_test_score = 0,
      verification_test_completed_at = null,
      updated_at = now()
    where id = auth.uid();
  end if;

  update auth.users
  set raw_user_meta_data = jsonb_set(
    coalesce(raw_user_meta_data, '{}'::jsonb),
    '{bilgi_alanlari}',
    to_jsonb(selected_areas),
    true
  )
  where id = auth.uid();
end;
$$;

revoke all on function public.update_my_expertise_areas(text[])
  from public;
grant execute on function public.update_my_expertise_areas(text[])
  to authenticated;

-- ============================================================
-- 3. BEŞ SORULUK TEST SONUCUNU PROFİLE KAYDETME
-- ============================================================

create or replace function public.complete_verification_test(
  test_score integer,
  tested_areas text[]
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

  if test_score not between 0 and 5 then
    raise exception 'Geçersiz test sonucu.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and expertise_areas @> tested_areas
      and tested_areas @> expertise_areas
  ) then
    raise exception 'Test alanları profilindeki alanlarla eşleşmiyor.';
  end if;

  update public.profiles
  set
    verification_test_completed = true,
    verification_test_score = test_score,
    verified_areas = tested_areas,
    verification_test_completed_at = now(),
    updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.complete_verification_test(integer, text[])
  from public;
grant execute on function public.complete_verification_test(integer, text[])
  to authenticated;

-- ============================================================
-- 4. KURUCU HESABININ ÖZEL DOĞRULAMA SONUCU
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


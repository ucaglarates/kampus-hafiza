-- ============================================================
-- KAMPÜSHAFIZA CANLI SOSYAL AĞ VERİTABANI
-- Gönderiler, yorumlar, beğeniler, takipler ve topluluklar
-- ============================================================

-- ============================================================
-- 1. TOPLULUKLAR VE TOPLULUK ÜYELERİ
-- ============================================================

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references public.profiles(id) on delete cascade,
  name text not null unique check (char_length(name) between 3 and 60),
  description text not null default '' check (char_length(description) <= 500),
  faculty text not null default '',
  department text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('member', 'admin', 'founder')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

-- Topluluğu kuran kişi otomatik olarak kurucu üye olur.
create or replace function public.add_community_founder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.community_members (community_id, user_id, role)
  values (new.id, new.founder_id, 'founder')
  on conflict (community_id, user_id) do update set role = 'founder';

  return new;
end;
$$;

drop trigger if exists add_founder_after_community_create
  on public.communities;

create trigger add_founder_after_community_create
after insert on public.communities
for each row execute function public.add_community_founder();

-- ============================================================
-- 2. GÖNDERİLER, YORUMLAR, BEĞENİLER VE TAKİPLER
-- ============================================================

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  category text not null default 'Bilgi',
  department text not null default '',
  tags text[] not null default '{}'
    check (cardinality(tags) <= 5),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists posts_created_at_idx
  on public.posts(created_at desc);
create index if not exists posts_author_id_idx
  on public.posts(author_id);
create index if not exists posts_community_id_idx
  on public.posts(community_id);
create index if not exists comments_post_id_idx
  on public.comments(post_id, created_at);
create index if not exists community_members_user_id_idx
  on public.community_members(user_id);
create index if not exists follows_following_id_idx
  on public.follows(following_id);

-- Normal kullanıcı, kendi gönderisinin moderasyon durumunu API üzerinden
-- değiştiremez. Durumu yalnızca yetkili moderatör güncelleyebilir.
create or replace function public.protect_post_moderation_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.moderation_status is distinct from new.moderation_status
    and not public.current_user_can_moderate()
  then
    raise exception 'Gönderi durumunu yalnızca moderatör değiştirebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_post_moderation_status_update
  on public.posts;
create trigger protect_post_moderation_status_update
before update on public.posts
for each row execute function public.protect_post_moderation_status();

-- ============================================================
-- 3. GÖNDERİ VE BEĞENİLERDEN XP KAZANMA
-- ============================================================

create or replace function public.reward_new_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set xp = xp + 5, updated_at = now()
  where id = new.author_id
    and role <> 'founder';

  perform public.refresh_community_level(new.author_id);
  return new;
end;
$$;

drop trigger if exists reward_after_post_insert on public.posts;
create trigger reward_after_post_insert
after insert on public.posts
for each row execute function public.reward_new_post();

create or replace function public.reward_helpful_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author_id uuid;
  affected_post_id uuid;
begin
  if tg_op = 'INSERT' then
    affected_post_id := new.post_id;
  else
    affected_post_id := old.post_id;
  end if;

  select author_id into post_author_id
  from public.posts
  where id = affected_post_id;

  if tg_op = 'INSERT' then
    update public.profiles
    set helpful_votes = helpful_votes + 1,
        xp = xp + 2,
        updated_at = now()
    where id = post_author_id
      and role <> 'founder';
  else
    update public.profiles
    set helpful_votes = greatest(helpful_votes - 1, 0),
        xp = greatest(xp - 2, 0),
        updated_at = now()
    where id = post_author_id
      and role <> 'founder';
  end if;

  perform public.refresh_community_level(post_author_id);
  if tg_op = 'INSERT' then
    return new;
  end if;

  return old;
end;
$$;

drop trigger if exists reward_after_like_insert on public.post_likes;
create trigger reward_after_like_insert
after insert on public.post_likes
for each row execute function public.reward_helpful_vote();

drop trigger if exists reward_after_like_delete on public.post_likes;
create trigger reward_after_like_delete
after delete on public.post_likes
for each row execute function public.reward_helpful_vote();

-- Moderatör doğru ve faydalı bir gönderiyi onayladığında katkı sayılır.
create or replace function public.moderate_post(
  target_post_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_status text;
  post_author_id uuid;
begin
  if not public.current_user_can_moderate() then
    raise exception 'Bu işlem için moderasyon yetkin yok.';
  end if;

  if new_status not in ('approved', 'rejected') then
    raise exception 'Geçersiz moderasyon durumu.';
  end if;

  select moderation_status, author_id
  into previous_status, post_author_id
  from public.posts
  where id = target_post_id
  for update;

  if not found then
    raise exception 'Gönderi bulunamadı.';
  end if;

  update public.posts
  set moderation_status = new_status,
      moderated_by = auth.uid(),
      moderated_at = now(),
      updated_at = now()
  where id = target_post_id;

  if new_status = 'approved' and previous_status <> 'approved' then
    update public.profiles
    set verified_contributions = verified_contributions + 1,
        xp = xp + 20,
        updated_at = now()
    where id = post_author_id
      and role <> 'founder';

    perform public.refresh_community_level(post_author_id);
  end if;
end;
$$;

revoke all on function public.moderate_post(uuid, text) from public;
grant execute on function public.moderate_post(uuid, text)
  to authenticated;

-- ============================================================
-- 4. ROW LEVEL SECURITY POLİTİKALARI
-- ============================================================

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.follows enable row level security;

drop policy if exists "Topluluklari giris yapanlar gorebilir"
  on public.communities;
create policy "Topluluklari giris yapanlar gorebilir"
on public.communities for select to authenticated using (true);

drop policy if exists "Dogrulanmis kullanici topluluk kurabilir"
  on public.communities;
create policy "Dogrulanmis kullanici topluluk kurabilir"
on public.communities for insert to authenticated
with check (
  founder_id = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and verification_test_completed
  )
);

drop policy if exists "Kurucu toplulugunu guncelleyebilir"
  on public.communities;
create policy "Kurucu toplulugunu guncelleyebilir"
on public.communities for update to authenticated
using (founder_id = auth.uid() or public.current_user_can_moderate())
with check (founder_id = auth.uid() or public.current_user_can_moderate());

drop policy if exists "Kurucu toplulugunu silebilir"
  on public.communities;
create policy "Kurucu toplulugunu silebilir"
on public.communities for delete to authenticated
using (founder_id = auth.uid() or public.current_user_is_moderator());

drop policy if exists "Topluluk uyelerini giris yapanlar gorebilir"
  on public.community_members;
create policy "Topluluk uyelerini giris yapanlar gorebilir"
on public.community_members for select to authenticated using (true);

drop policy if exists "Kullanici topluluga katilabilir"
  on public.community_members;
create policy "Kullanici topluluga katilabilir"
on public.community_members for insert to authenticated
with check (user_id = auth.uid() and role = 'member');

drop policy if exists "Kullanici topluluktan ayrilabilir"
  on public.community_members;
create policy "Kullanici topluluktan ayrilabilir"
on public.community_members for delete to authenticated
using (user_id = auth.uid() and role = 'member');

drop policy if exists "Gonderileri giris yapanlar gorebilir"
  on public.posts;
create policy "Gonderileri giris yapanlar gorebilir"
on public.posts for select to authenticated
using (
  moderation_status <> 'rejected'
  or author_id = auth.uid()
  or public.current_user_can_moderate()
);

drop policy if exists "Dogrulanmis kullanici gonderi yazabilir"
  on public.posts;
create policy "Dogrulanmis kullanici gonderi yazabilir"
on public.posts for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    moderation_status = 'pending'
    or public.current_user_can_moderate()
  )
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and verification_test_completed
  )
  and (
    community_id is null
    or exists (
      select 1 from public.community_members
      where community_id = posts.community_id
        and user_id = auth.uid()
    )
  )
);

drop policy if exists "Yazar veya moderator gonderiyi guncelleyebilir"
  on public.posts;
create policy "Yazar veya moderator gonderiyi guncelleyebilir"
on public.posts for update to authenticated
using (author_id = auth.uid() or public.current_user_can_moderate())
with check (author_id = auth.uid() or public.current_user_can_moderate());

drop policy if exists "Yazar veya moderator gonderiyi silebilir"
  on public.posts;
create policy "Yazar veya moderator gonderiyi silebilir"
on public.posts for delete to authenticated
using (
  author_id = auth.uid()
  or public.current_user_can_moderate()
  or exists (
    select 1
    from public.communities
    where communities.id = posts.community_id
      and communities.founder_id = auth.uid()
  )
);

drop policy if exists "Yorumlari giris yapanlar gorebilir"
  on public.comments;
create policy "Yorumlari giris yapanlar gorebilir"
on public.comments for select to authenticated using (true);

drop policy if exists "Dogrulanmis kullanici yorum yazabilir"
  on public.comments;
create policy "Dogrulanmis kullanici yorum yazabilir"
on public.comments for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and verification_test_completed
  )
);

drop policy if exists "Yazar veya moderator yorumu silebilir"
  on public.comments;
create policy "Yazar veya moderator yorumu silebilir"
on public.comments for delete to authenticated
using (
  author_id = auth.uid()
  or public.current_user_can_moderate()
  or exists (
    select 1
    from public.posts
    join public.communities
      on communities.id = posts.community_id
    where posts.id = comments.post_id
      and communities.founder_id = auth.uid()
  )
);

drop policy if exists "Begenileri giris yapanlar gorebilir"
  on public.post_likes;
create policy "Begenileri giris yapanlar gorebilir"
on public.post_likes for select to authenticated using (true);

drop policy if exists "Kullanici gonderiyi begenebilir"
  on public.post_likes;
create policy "Kullanici gonderiyi begenebilir"
on public.post_likes for insert to authenticated
with check (
  user_id = auth.uid()
  and not exists (
    select 1 from public.posts
    where id = post_likes.post_id and author_id = auth.uid()
  )
);

drop policy if exists "Kullanici begenisini kaldirabilir"
  on public.post_likes;
create policy "Kullanici begenisini kaldirabilir"
on public.post_likes for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Takipleri giris yapanlar gorebilir"
  on public.follows;
create policy "Takipleri giris yapanlar gorebilir"
on public.follows for select to authenticated using (true);

drop policy if exists "Kullanici baskasini takip edebilir"
  on public.follows;
create policy "Kullanici baskasini takip edebilir"
on public.follows for insert to authenticated
with check (follower_id = auth.uid() and following_id <> auth.uid());

drop policy if exists "Kullanici takibi birakabilir"
  on public.follows;
create policy "Kullanici takibi birakabilir"
on public.follows for delete to authenticated
using (follower_id = auth.uid());

revoke all on table public.communities from anon;
revoke all on table public.community_members from anon;
revoke all on table public.posts from anon;
revoke all on table public.comments from anon;
revoke all on table public.post_likes from anon;
revoke all on table public.follows from anon;

grant select, insert, update, delete on table public.communities
  to authenticated;
grant select, insert, update, delete on table public.community_members
  to authenticated;
grant select, insert, update, delete on table public.posts
  to authenticated;
grant select, insert, update, delete on table public.comments
  to authenticated;
grant select, insert, delete on table public.post_likes
  to authenticated;
grant select, insert, delete on table public.follows
  to authenticated;

-- ============================================================
-- 5. CANLI GÜNCELLEMELER
-- ============================================================

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'posts',
    'comments',
    'post_likes',
    'follows',
    'communities',
    'community_members'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end;
$$;

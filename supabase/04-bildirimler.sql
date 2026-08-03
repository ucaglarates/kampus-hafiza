-- ============================================================
-- KAMPÜSHAFIZA CANLI BİLDİRİM SİSTEMİ
-- Takip, yorum, faydalı oy, moderasyon ve topluluk üyeliği
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (
    type in (
      'follow',
      'comment',
      'like',
      'post_approved',
      'post_rejected',
      'community_join'
    )
  ),
  post_id uuid references public.posts(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);

-- ============================================================
-- 1. YENİ TAKİP BİLDİRİMİ
-- ============================================================

create or replace function public.notify_new_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists notify_after_follow on public.follows;
create trigger notify_after_follow
after insert on public.follows
for each row execute function public.notify_new_follow();

-- ============================================================
-- 2. YORUM VE FAYDALI OY BİLDİRİMLERİ
-- ============================================================

create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author_id uuid;
begin
  select author_id into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id <> new.author_id then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      post_id
    )
    values (post_author_id, new.author_id, 'comment', new.post_id);
  end if;

  return new;
end;
$$;

drop trigger if exists notify_after_comment on public.comments;
create trigger notify_after_comment
after insert on public.comments
for each row execute function public.notify_new_comment();

create or replace function public.notify_new_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author_id uuid;
begin
  select author_id into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id <> new.user_id then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      post_id
    )
    values (post_author_id, new.user_id, 'like', new.post_id);
  end if;

  return new;
end;
$$;

drop trigger if exists notify_after_like on public.post_likes;
create trigger notify_after_like
after insert on public.post_likes
for each row execute function public.notify_new_like();

-- ============================================================
-- 3. MODERASYON SONUCU BİLDİRİMİ
-- ============================================================

create or replace function public.notify_post_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.moderation_status is distinct from new.moderation_status
    and new.moderation_status in ('approved', 'rejected')
    and new.author_id <> coalesce(new.moderated_by, new.author_id)
  then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      post_id
    )
    values (
      new.author_id,
      new.moderated_by,
      case
        when new.moderation_status = 'approved'
          then 'post_approved'
        else 'post_rejected'
      end,
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_after_post_moderation on public.posts;
create trigger notify_after_post_moderation
after update of moderation_status on public.posts
for each row execute function public.notify_post_moderation();

-- ============================================================
-- 4. TOPLULUĞA YENİ ÜYE BİLDİRİMİ
-- ============================================================

create or replace function public.notify_community_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  community_founder_id uuid;
begin
  select founder_id into community_founder_id
  from public.communities
  where id = new.community_id;

  if community_founder_id <> new.user_id then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      community_id
    )
    values (
      community_founder_id,
      new.user_id,
      'community_join',
      new.community_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_after_community_join
  on public.community_members;
create trigger notify_after_community_join
after insert on public.community_members
for each row execute function public.notify_community_join();

-- ============================================================
-- 5. BİLDİRİM GÜVENLİĞİ
-- Her kullanıcı yalnızca kendisine gelen bildirimi görebilir,
-- okuyabilir veya silebilir. Bildirimi istemci oluşturamaz.
-- ============================================================

alter table public.notifications enable row level security;

drop policy if exists "Kullanici bildirimlerini gorebilir"
  on public.notifications;
create policy "Kullanici bildirimlerini gorebilir"
on public.notifications for select to authenticated
using (recipient_id = auth.uid());

drop policy if exists "Kullanici bildirimini okuyabilir"
  on public.notifications;
create policy "Kullanici bildirimini okuyabilir"
on public.notifications for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

drop policy if exists "Kullanici bildirimini silebilir"
  on public.notifications;
create policy "Kullanici bildirimini silebilir"
on public.notifications for delete to authenticated
using (recipient_id = auth.uid());

revoke all on table public.notifications from anon;
revoke all on table public.notifications from authenticated;
grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

-- ============================================================
-- 6. SUPABASE REALTIME
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime
      add table public.notifications;
  end if;
end;
$$;

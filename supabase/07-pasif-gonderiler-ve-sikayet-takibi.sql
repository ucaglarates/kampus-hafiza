-- Run after 01–06, before deploying the corresponding frontend.
-- Reversible post removal is separate from account erasure / lawful retention.
begin;

alter table public.posts
  add column if not exists is_active boolean not null default true,
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by uuid references public.profiles(id) on delete set null;
create index if not exists posts_active_created_idx on public.posts(created_at desc) where is_active;

-- Clients cannot hard-delete posts or forge lifecycle/ownership fields.
revoke delete, update, insert on public.posts from authenticated;
grant insert (author_id, community_id, body, category, department, tags, moderation_status)
  on public.posts to authenticated;
grant update (body, category, department, tags) on public.posts to authenticated;
drop policy if exists "Yazar veya moderator gonderiyi silebilir" on public.posts;
drop policy if exists "Gonderileri giris yapanlar gorebilir" on public.posts;
create policy "Gonderileri giris yapanlar gorebilir" on public.posts for select to authenticated
using (public.current_user_can_moderate() or (
  is_active and (moderation_status = 'approved' or author_id = auth.uid())
));

create or replace function public.deactivate_post(target_post_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.posts;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli.'; end if;
  select * into p from public.posts where id = target_post_id for update;
  if not found then raise exception 'Gönderi bulunamadı.'; end if;
  if p.author_id <> auth.uid() and not public.current_user_can_moderate()
    and not exists (select 1 from public.communities where id = p.community_id and founder_id = auth.uid())
  then raise exception 'Bu gönderiyi kaldırma yetkin yok.'; end if;
  if not p.is_active then return; end if;
  update public.posts set is_active = false, deactivated_at = now(), deactivated_by = auth.uid(), updated_at = now()
  where id = target_post_id;
end; $$;
revoke all on function public.deactivate_post(uuid) from public;
grant execute on function public.deactivate_post(uuid) to authenticated;

-- Deleting a community must not cascade-delete archived posts.
alter table public.posts drop constraint if exists posts_community_id_fkey;
alter table public.posts add constraint posts_community_id_fkey
 foreign key (community_id) references public.communities(id) on delete set null;
create or replace function public.archive_community_posts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 update public.posts set is_active = false, deactivated_at = now(),
 deactivated_by = (select id from public.profiles where id = auth.uid()), updated_at = now()
 where community_id = old.id and is_active;
 return old;
end; $$;
drop trigger if exists archive_community_posts_before_delete on public.communities;
create trigger archive_community_posts_before_delete before delete on public.communities
for each row execute function public.archive_community_posts();

-- Inactive posts must not leak through comment/like queries or accept new interactions.
drop policy if exists "Yorumlari giris yapanlar gorebilir" on public.comments;
create policy "Yorumlari giris yapanlar gorebilir" on public.comments for select to authenticated
using (exists (select 1 from public.posts p where p.id = comments.post_id and p.is_active));
drop policy if exists "Dogrulanmis kullanici yorum yazabilir" on public.comments;
create policy "Dogrulanmis kullanici yorum yazabilir" on public.comments for insert to authenticated
with check (author_id = auth.uid()
 and exists (select 1 from public.profiles where id = auth.uid() and verification_test_completed)
 and exists (select 1 from public.posts p where p.id = comments.post_id and p.is_active and p.moderation_status = 'approved'));
drop policy if exists "Begenileri giris yapanlar gorebilir" on public.post_likes;
create policy "Begenileri giris yapanlar gorebilir" on public.post_likes for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_likes.post_id and p.is_active));
drop policy if exists "Kullanici gonderiyi begenebilir" on public.post_likes;
create policy "Kullanici gonderiyi begenebilir" on public.post_likes for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.posts p
 where p.id = post_likes.post_id and p.is_active and p.moderation_status = 'approved' and p.author_id <> auth.uid()));

alter table public.reports
 add column if not exists content_snapshot text,
 add column if not exists resolution_note text not null default '',
 add column if not exists action_taken text not null default 'none';

-- Capture only target content, never private identity fields. SECURITY INVOKER
-- deliberately checks the reporter's RLS visibility before accepting a target.
create or replace function public.capture_report_content()
returns trigger language plpgsql set search_path = '' as $$
declare content text;
begin
 if new.target_type = 'post' then
  select body into content from public.posts where id = new.post_id and is_active;
 elsif new.target_type = 'comment' then
  select body into content from public.comments where id = new.comment_id;
 elsif new.target_type = 'community' then
  select name || E'\n' || description into content from public.communities where id = new.community_id;
 else
  select full_name into content from public.profiles where id = new.profile_id;
 end if;
 if content is null then raise exception 'Şikâyet edilen içerik erişilebilir değil.'; end if;
 new.content_snapshot := content;
 new.status := 'pending'; new.reviewed_by := null; new.reviewed_at := null;
 new.resolution_note := ''; new.action_taken := 'none';
 return new;
end; $$;
drop trigger if exists capture_report_content_before_insert on public.reports;
create trigger capture_report_content_before_insert before insert on public.reports
for each row execute function public.capture_report_content();

-- Backfill existing reports without overwriting snapshots on later runs.
update public.reports r set content_snapshot = coalesce(
 (select body from public.posts where id = r.post_id),
 (select body from public.comments where id = r.comment_id),
 (select name || E'\n' || description from public.communities where id = r.community_id),
 (select full_name from public.profiles where id = r.profile_id)
) where content_snapshot is null;
revoke insert, update on public.reports from authenticated;
-- Revoke the column privileges granted by migration 06 as well.
revoke update (status, reviewed_by, reviewed_at) on public.reports from authenticated;
grant insert (reporter_id, target_type, post_id, comment_id, community_id, profile_id, reason, details)
 on public.reports to authenticated;

create table if not exists public.report_events (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.reports(id) on delete cascade,
 status text not null check (status in ('pending','reviewed','resolved','rejected')),
 note text not null,
 action_taken text not null default 'none' check (action_taken in ('none','deactivate_post')),
 created_at timestamptz not null default now()
);
alter table public.report_events enable row level security;
drop policy if exists "Sikayet taraflari gecmisi gorebilir" on public.report_events;
create policy "Sikayet taraflari gecmisi gorebilir" on public.report_events for select to authenticated
using (exists (select 1 from public.reports r where r.id = report_id
 and (r.reporter_id = auth.uid() or public.current_user_can_moderate())));
revoke all on public.report_events from anon, authenticated;
grant select on public.report_events to authenticated;

alter table public.notifications
 add column if not exists report_id uuid references public.reports(id) on delete cascade,
 add column if not exists message text;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
 type in ('follow','comment','like','post_approved','post_rejected','community_join','report_update')
);

-- Atomic review, optional content action, audit history and recipient notification.
create or replace function public.review_report(
 target_report_id uuid, new_status text, reviewer_note text, requested_action text default 'none'
) returns void language plpgsql security definer set search_path = '' as $$
declare r public.reports; status_label text;
begin
 if auth.uid() is null or not public.current_user_can_moderate() then
  raise exception 'Yalnızca yetkili moderatör işlem yapabilir.';
 end if;
 if new_status not in ('reviewed','resolved','rejected') or new_status is null then raise exception 'Geçersiz durum.'; end if;
 if reviewer_note is null or char_length(trim(reviewer_note)) not between 5 and 1000 then
  raise exception 'Şikâyetçiye gösterilecek 5–1000 karakterlik bir açıklama gerekli.';
 end if;
 if requested_action is null or requested_action not in ('none','deactivate_post') then raise exception 'Geçersiz işlem.'; end if;
 select * into r from public.reports where id = target_report_id for update;
 if not found then raise exception 'Şikâyet bulunamadı.'; end if;
 if r.status in ('resolved','rejected') then raise exception 'Bu şikâyet zaten sonuçlandırıldı.'; end if;
 if r.status = new_status then raise exception 'Şikâyet zaten bu durumda.'; end if;
 if requested_action = 'deactivate_post' then
  if r.target_type <> 'post' or new_status <> 'resolved' then raise exception 'Bu işlem yalnızca gönderi şikâyetini çözerken kullanılabilir.'; end if;
  perform public.deactivate_post(r.post_id);
 end if;
 update public.reports set status = new_status, resolution_note = trim(reviewer_note),
  action_taken = requested_action, reviewed_by = auth.uid(), reviewed_at = now()
 where id = target_report_id;
 insert into public.report_events(report_id, status, note, action_taken)
 values (r.id, new_status, trim(reviewer_note), requested_action);
 status_label := case new_status when 'reviewed' then 'İnceleniyor' when 'resolved' then 'Sonuçlandı' else 'İhlal bulunamadı' end;
 insert into public.notifications(recipient_id, actor_id, type, report_id, message)
 values (r.reporter_id, null, 'report_update', r.id, 'Şikâyetin: ' || status_label || '. ' || trim(reviewer_note));
end; $$;
revoke all on function public.review_report(uuid,text,text,text) from public;
grant execute on function public.review_report(uuid,text,text,text) to authenticated;

-- reports and notifications are already published by migrations 04 and 06.
do $$ begin
 if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
  select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'report_events'
 ) then alter publication supabase_realtime add table public.report_events; end if;
end; $$;
commit;

-- Database-admin-only restore (not a client RPC):
-- update public.posts set is_active = true, deactivated_at = null,
--   deactivated_by = null, updated_at = now() where id = '<post UUID>';
-- This keeps the previous moderation status: rejected posts remain rejected.

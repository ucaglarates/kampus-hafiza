-- No anonymous-post feature is introduced here. Public profile names remain public.
-- Private email / consent records stop being exposed through the community query.
begin;
create or replace function public.current_user_is_founder()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = auth.uid() and role = 'founder');
$$;
revoke all on function public.current_user_is_founder() from public;
grant execute on function public.current_user_is_founder() to authenticated;

drop policy if exists "Giris yapanlar profilleri gorebilir" on public.profiles;
drop policy if exists "Ozel profil sahibi ve kurucu" on public.profiles;
create policy "Ozel profil sahibi ve kurucu" on public.profiles for select to authenticated
using (id = auth.uid() or public.current_user_is_founder());

-- Explicit projection; never SELECT * here. Owner-backed view exposes public fields only.
create or replace view public.community_profiles with (security_barrier = true) as
 select id, full_name, faculty, department, expertise_areas, role, level, xp,
 verified_contributions, helpful_votes, avatar_url, cover_url
 from public.profiles where auth.uid() is not null;
revoke all on public.community_profiles from public, anon;
grant select on public.community_profiles to authenticated;

create table if not exists public.identity_access_log (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references public.profiles(id) on delete set null,
 subject_id uuid references public.profiles(id) on delete set null,
 post_id uuid references public.posts(id) on delete set null,
 purpose text not null check (purpose in ('moderation','authority_request')),
 reason text not null check (char_length(reason) between 10 and 1000),
 request_reference text,
 created_at timestamptz not null default now()
);
alter table public.identity_access_log enable row level security;
drop policy if exists "Kurucu erisim kayitlarini gorur" on public.identity_access_log;
create policy "Kurucu erisim kayitlarini gorur" on public.identity_access_log for select to authenticated
using (public.current_user_is_founder());
revoke all on public.identity_access_log from public, anon, authenticated;
grant select on public.identity_access_log to authenticated;

create or replace function public.inspect_post_author(
 target_post_id uuid, access_purpose text, access_reason text, official_reference text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare subject public.profiles;
begin
 if auth.uid() is null or not public.current_user_is_founder() then raise exception 'Bu inceleme yalnızca kurucu hesabına açıktır.'; end if;
 if access_purpose is null or access_purpose not in ('moderation','authority_request') then raise exception 'Geçersiz inceleme amacı.'; end if;
 if access_reason is null or char_length(trim(access_reason)) not between 10 and 1000 then raise exception '10–1000 karakterlik somut inceleme gerekçesi gerekli.'; end if;
 if access_purpose = 'authority_request' and (official_reference is null or char_length(trim(official_reference)) not between 3 and 200) then raise exception 'Resmî talebin kurum ve evrak referansını yaz.'; end if;
 if official_reference is not null and char_length(official_reference)>200 then raise exception 'Evrak referansı çok uzun.'; end if;
 select p.* into subject from public.profiles p join public.posts s on s.author_id=p.id where s.id=target_post_id;
 if not found then raise exception 'Gönderi veya hesap bulunamadı.'; end if;
 insert into public.identity_access_log(actor_id,subject_id,post_id,purpose,reason,request_reference)
 values(auth.uid(),subject.id,target_post_id,access_purpose,trim(access_reason),nullif(trim(official_reference),''));
 return jsonb_build_object('full_name',subject.full_name,'email',subject.email);
end; $$;
revoke all on function public.inspect_post_author(uuid,text,text,text) from public;
grant execute on function public.inspect_post_author(uuid,text,text,text) to authenticated;

-- Profile reports use the public projection after private profile RLS is enabled.
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
  select full_name into content from public.community_profiles where id = new.profile_id;
 end if;
 if content is null then raise exception 'Şikâyet edilen içerik erişilebilir değil.'; end if;
 new.content_snapshot := content;
 new.status := 'pending'; new.reviewed_by := null; new.reviewed_at := null;
 new.resolution_note := ''; new.action_taken := 'none';
 return new;
end; $$;
commit;

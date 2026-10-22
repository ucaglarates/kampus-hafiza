-- Apply together with the matching policy text. Earlier acceptances stay recorded.
begin;
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

  if accepted_version is distinct from '2026-10-22' then
    raise exception 'Hukuki metnin güncel sürümü kabul edilmelidir.';
  end if;

  if cross_border_accepted is distinct from true then
    raise exception 'Yurt dışı aktarım tercihi onaylanmadı.';
  end if;

  if age_confirmed is distinct from true then
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


commit;

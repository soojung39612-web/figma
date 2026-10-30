create table public.myfit_account_lookup_limits (
 fingerprint text primary key check (length(fingerprint)=64),
 window_start timestamptz not null default now(), attempts integer not null default 1
);
alter table public.myfit_account_lookup_limits enable row level security;
alter table public.myfit_account_lookup_limits force row level security;
revoke all on public.myfit_account_lookup_limits from public,anon,authenticated;
create function public.myfit_find_email(lookup_name text,lookup_phone text,request_fingerprint text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare tries integer; hints jsonb;
begin
 if length(request_fingerprint)<>64 or length(lookup_name) not between 1 and 30 or lookup_phone !~ '^01[0-9]{8,9}$' then
  return jsonb_build_object('error','invalid');
 end if;
 insert into public.myfit_account_lookup_limits as limits(fingerprint) values(request_fingerprint)
 on conflict(fingerprint) do update set
 attempts=case when limits.window_start < now()-interval '15 minutes' then 1 else limits.attempts+1 end,
 window_start=case when limits.window_start < now()-interval '15 minutes' then now() else limits.window_start end
 returning attempts into tries;
 if tries>5 then return jsonb_build_object('error','rate_limit'); end if;
 select coalesce(jsonb_agg(distinct masked),'[]'::jsonb) into hints from (
  select left(split_part(u.email,'@',1),1)||repeat('*',greatest(3,length(split_part(u.email,'@',1))-1))||'@'||split_part(u.email,'@',2) as masked
  from auth.users u left join public.myfit_members m on m.user_id=u.id
  where u.deleted_at is null and u.email is not null
   and trim(coalesce(m.data->'address'->>'name',u.raw_user_meta_data->>'full_name',''))=lookup_name
   and regexp_replace(coalesce(m.data->'address'->>'phone',u.raw_user_meta_data->>'phone',''),'[^0-9]','','g')=lookup_phone
  limit 5
 ) found;
 return jsonb_build_object('emails',hints);
end; $$;
revoke all on function public.myfit_find_email(text,text,text) from public,anon,authenticated;
grant execute on function public.myfit_find_email(text,text,text) to service_role;

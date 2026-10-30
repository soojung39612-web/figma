-- Run once in the selected Supabase project. No public access to member records.
create table if not exists public.myfit_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.myfit_members enable row level security;
alter table public.myfit_members force row level security;
revoke all on public.myfit_members from anon;
grant select, insert, update on public.myfit_members to authenticated;
create policy "Members read their own data" on public.myfit_members
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Members create their own data" on public.myfit_members
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Members update their own data" on public.myfit_members
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create or replace function public.myfit_touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger myfit_members_updated_at before update on public.myfit_members
for each row execute function public.myfit_touch_updated_at();

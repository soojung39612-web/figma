create table public.myfit_guest_orders (
 id text primary key, lookup_hash text unique not null check(length(lookup_hash)=64),
 phone_fingerprint text not null check(length(phone_fingerprint)=64),
 data jsonb not null check(jsonb_typeof(data)='object'),created_at timestamptz not null default now()
);
create index myfit_guest_orders_phone_created on public.myfit_guest_orders(phone_fingerprint,created_at);
alter table public.myfit_guest_orders enable row level security;
alter table public.myfit_guest_orders force row level security;
revoke all on public.myfit_guest_orders from public,anon,authenticated;
grant select,insert on public.myfit_guest_orders to service_role;

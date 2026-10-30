create table public.myfit_guest_reservations (
  id uuid primary key,
  lookup_hash text unique not null check (length(lookup_hash)=64),
  phone_fingerprint text not null check (length(phone_fingerprint)=64),
  guest_name text not null check (char_length(guest_name) between 1 and 30),
  phone_last4 text not null check (phone_last4 ~ '^[0-9]{4}$'),
  store_id smallint not null check (store_id between 0 and 2),
  visit_date date not null,
  visit_time text not null check (visit_time in ('10:00','11:00','14:00','16:00')),
  created_at timestamptz not null default now()
);
create index myfit_guest_reservations_phone_created_idx on public.myfit_guest_reservations(phone_fingerprint,created_at);
alter table public.myfit_guest_reservations enable row level security;
alter table public.myfit_guest_reservations force row level security;
revoke all on public.myfit_guest_reservations from public,anon,authenticated;
grant select,insert on public.myfit_guest_reservations to service_role;

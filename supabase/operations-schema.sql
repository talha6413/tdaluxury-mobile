-- TDA Luxury personel, cihaz ve stok yönetimi
-- Supabase SQL Editor'de bir kez çalıştırılır.

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text not null default '',
  serial_number text not null default '',
  room text not null default '',
  shot_count bigint not null default 0 check (shot_count >= 0),
  maintenance_due date,
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'adet',
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  min_quantity numeric(12,2) not null default 0 check (min_quantity >= 0),
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists devices_active_idx on public.devices(active, name);
create index if not exists stock_items_active_idx on public.stock_items(active, name);

alter table public.devices enable row level security;
alter table public.stock_items enable row level security;

drop policy if exists "Staff read devices" on public.devices;
create policy "Staff read devices" on public.devices for select to authenticated
using (private.is_mobile_staff());

drop policy if exists "Admins manage devices" on public.devices;
create policy "Admins manage devices" on public.devices for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Staff read stock" on public.stock_items;
create policy "Staff read stock" on public.stock_items for select to authenticated
using (private.is_mobile_staff());

drop policy if exists "Admins manage stock" on public.stock_items;
create policy "Admins manage stock" on public.stock_items for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.devices, public.stock_items to authenticated;
grant insert, update, delete on public.devices, public.stock_items to authenticated;

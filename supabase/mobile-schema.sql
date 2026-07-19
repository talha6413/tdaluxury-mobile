create schema if not exists private;

create type public.app_role as enum ('customer', 'staff', 'admin');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.payment_method as enum ('cash', 'card', 'transfer', 'other');

create table public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text not null default '',
  phone text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text not null default '',
  birth_date date,
  notes text not null default '',
  marketing_consent boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  title text not null default 'Uzman',
  phone text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  staff_id uuid references public.staff_members(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.customer_packages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  title text not null,
  total_sessions integer not null check (total_sessions > 0),
  used_sessions integer not null default 0 check (used_sessions >= 0 and used_sessions <= total_sessions),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0 and paid_amount <= total_amount),
  starts_on date not null default current_date,
  expires_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_records (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.customer_packages(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  staff_id uuid references public.staff_members(id) on delete set null,
  session_number integer not null check (session_number > 0),
  performed_at timestamptz not null default now(),
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (package_id, session_number)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  package_id uuid references public.customer_packages(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  method public.payment_method not null,
  paid_at timestamptz not null default now(),
  reference text not null default '',
  notes text not null default '',
  received_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.customer_photos (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  storage_path text not null unique,
  category text not null default 'progress',
  taken_at timestamptz not null default now(),
  visible_to_customer boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index appointments_starts_at_idx on public.appointments(starts_at);
create index appointments_customer_idx on public.appointments(customer_id, starts_at desc);
create index appointments_staff_idx on public.appointments(staff_id, starts_at desc);
create index packages_customer_idx on public.customer_packages(customer_id, active);
create index payments_customer_idx on public.payments(customer_id, paid_at desc);
create index photos_customer_idx on public.customer_photos(customer_id, taken_at desc);

create or replace function private.is_mobile_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.app_members
    where user_id = (select auth.uid()) and role in ('staff', 'admin') and active
  ) or public.is_admin();
$$;
revoke all on function private.is_mobile_staff() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_mobile_staff() to authenticated;

alter table public.app_members enable row level security;
alter table public.customers enable row level security;
alter table public.staff_members enable row level security;
alter table public.appointments enable row level security;
alter table public.customer_packages enable row level security;
alter table public.session_records enable row level security;
alter table public.payments enable row level security;
alter table public.customer_photos enable row level security;

create policy "Members read own profile" on public.app_members for select to authenticated using (user_id = (select auth.uid()) or private.is_mobile_staff());
create policy "Admins manage members" on public.app_members for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Customers read own customer card" on public.customers for select to authenticated using (auth_user_id = (select auth.uid()) or private.is_mobile_staff());
create policy "Staff manage customers" on public.customers for all to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());
create policy "Staff read staff" on public.staff_members for select to authenticated using (private.is_mobile_staff());
create policy "Admins manage staff" on public.staff_members for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Customers read own appointments" on public.appointments for select to authenticated using (exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = (select auth.uid())) or private.is_mobile_staff());
create policy "Customers create own appointments" on public.appointments for insert to authenticated with check (exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = (select auth.uid())));
create policy "Staff manage appointments" on public.appointments for all to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());

create policy "Customers read own packages" on public.customer_packages for select to authenticated using (exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = (select auth.uid())) or private.is_mobile_staff());
create policy "Staff manage packages" on public.customer_packages for all to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());
create policy "Customers read own sessions" on public.session_records for select to authenticated using (exists (select 1 from public.customer_packages p join public.customers c on c.id = p.customer_id where p.id = package_id and c.auth_user_id = (select auth.uid())) or private.is_mobile_staff());
create policy "Staff manage sessions" on public.session_records for all to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());
create policy "Customers read own payments" on public.payments for select to authenticated using (exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = (select auth.uid())) or private.is_mobile_staff());
create policy "Staff manage payments" on public.payments for all to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());
create policy "Customers read shared photos" on public.customer_photos for select to authenticated using ((visible_to_customer and exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = (select auth.uid()))) or private.is_mobile_staff());
create policy "Staff manage photos" on public.customer_photos for all to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());

grant select on public.app_members, public.customers, public.staff_members, public.appointments, public.customer_packages, public.session_records, public.payments, public.customer_photos to authenticated;
grant insert, update, delete on public.app_members, public.customers, public.staff_members, public.appointments, public.customer_packages, public.session_records, public.payments, public.customer_photos to authenticated;

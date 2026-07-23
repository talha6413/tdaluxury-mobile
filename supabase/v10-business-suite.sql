-- TDA Luxury Mobil V10 - gider ve işletme görevleri

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'Genel',
  paid_at timestamptz not null default now(),
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_paid_at_idx on public.expenses(paid_at desc);
alter table public.expenses enable row level security;

drop policy if exists "Staff read expenses" on public.expenses;
create policy "Staff read expenses" on public.expenses
for select to authenticated using (private.is_mobile_staff());

drop policy if exists "Admins manage expenses" on public.expenses;
create policy "Admins manage expenses" on public.expenses
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.expenses to authenticated;

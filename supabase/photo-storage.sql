-- TDA Luxury private müşteri fotoğraf arşivi
-- Supabase SQL Editor'de bir kez çalıştırılır.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-photos',
  'customer-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Mobile staff read customer photos" on storage.objects;
create policy "Mobile staff read customer photos"
on storage.objects for select to authenticated
using (bucket_id = 'customer-photos' and private.is_mobile_staff());

drop policy if exists "Mobile staff upload customer photos" on storage.objects;
create policy "Mobile staff upload customer photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'customer-photos' and private.is_mobile_staff());

drop policy if exists "Mobile staff update customer photos" on storage.objects;
create policy "Mobile staff update customer photos"
on storage.objects for update to authenticated
using (bucket_id = 'customer-photos' and private.is_mobile_staff())
with check (bucket_id = 'customer-photos' and private.is_mobile_staff());

drop policy if exists "Mobile staff delete customer photos" on storage.objects;
create policy "Mobile staff delete customer photos"
on storage.objects for delete to authenticated
using (bucket_id = 'customer-photos' and private.is_mobile_staff());

create index appointments_created_by_idx on public.appointments(created_by);
create index appointments_service_id_idx on public.appointments(service_id);
create index customer_packages_service_id_idx on public.customer_packages(service_id);
create index customer_photos_appointment_id_idx on public.customer_photos(appointment_id);
create index customer_photos_uploaded_by_idx on public.customer_photos(uploaded_by);
create index payments_package_id_idx on public.payments(package_id);
create index payments_received_by_idx on public.payments(received_by);
create index session_records_appointment_id_idx on public.session_records(appointment_id);
create index session_records_staff_id_idx on public.session_records(staff_id);

drop policy "Admins manage members" on public.app_members;
create policy "Admins insert members" on public.app_members for insert to authenticated with check (public.is_admin());
create policy "Admins update members" on public.app_members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete members" on public.app_members for delete to authenticated using (public.is_admin());

drop policy "Staff manage customers" on public.customers;
create policy "Staff insert customers" on public.customers for insert to authenticated with check (private.is_mobile_staff());
create policy "Staff update customers" on public.customers for update to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());
create policy "Staff delete customers" on public.customers for delete to authenticated using (private.is_mobile_staff());

drop policy "Admins manage staff" on public.staff_members;
create policy "Admins insert staff" on public.staff_members for insert to authenticated with check (public.is_admin());
create policy "Admins update staff" on public.staff_members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete staff" on public.staff_members for delete to authenticated using (public.is_admin());

drop policy "Customers create own appointments" on public.appointments;
drop policy "Staff manage appointments" on public.appointments;
create policy "Authorized users create appointments" on public.appointments for insert to authenticated with check (
  private.is_mobile_staff() or exists (
    select 1 from public.customers c where c.id = customer_id and c.auth_user_id = (select auth.uid())
  )
);
create policy "Staff update appointments" on public.appointments for update to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());
create policy "Staff delete appointments" on public.appointments for delete to authenticated using (private.is_mobile_staff());

drop policy "Staff manage packages" on public.customer_packages;
create policy "Staff insert packages" on public.customer_packages for insert to authenticated with check (private.is_mobile_staff());
create policy "Staff update packages" on public.customer_packages for update to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());
create policy "Staff delete packages" on public.customer_packages for delete to authenticated using (private.is_mobile_staff());

drop policy "Staff manage sessions" on public.session_records;
create policy "Staff insert sessions" on public.session_records for insert to authenticated with check (private.is_mobile_staff());
create policy "Staff update sessions" on public.session_records for update to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());
create policy "Staff delete sessions" on public.session_records for delete to authenticated using (private.is_mobile_staff());

drop policy "Staff manage payments" on public.payments;
create policy "Staff insert payments" on public.payments for insert to authenticated with check (private.is_mobile_staff());
create policy "Staff update payments" on public.payments for update to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());
create policy "Staff delete payments" on public.payments for delete to authenticated using (private.is_mobile_staff());

drop policy "Staff manage photos" on public.customer_photos;
create policy "Staff insert photos" on public.customer_photos for insert to authenticated with check (private.is_mobile_staff());
create policy "Staff update photos" on public.customer_photos for update to authenticated using (private.is_mobile_staff()) with check (private.is_mobile_staff());
create policy "Staff delete photos" on public.customer_photos for delete to authenticated using (private.is_mobile_staff());

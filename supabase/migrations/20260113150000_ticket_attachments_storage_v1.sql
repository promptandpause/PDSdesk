insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

drop policy if exists ticket_attachments_storage_select on storage.objects;
create policy ticket_attachments_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ticket-attachments'
  and split_part(name, '/', 1) = 'tickets'
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists(
    select 1
    from public.tickets t
    where t.id = split_part(name, '/', 2)::uuid
  )
);

drop policy if exists ticket_attachments_storage_insert on storage.objects;
create policy ticket_attachments_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ticket-attachments'
  and owner = auth.uid()
  and split_part(name, '/', 1) = 'tickets'
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists(
    select 1
    from public.tickets t
    where t.id = split_part(name, '/', 2)::uuid
  )
);

drop policy if exists ticket_attachments_storage_update on storage.objects;
create policy ticket_attachments_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ticket-attachments'
  and owner = auth.uid()
)
with check (
  bucket_id = 'ticket-attachments'
  and owner = auth.uid()
);

drop policy if exists ticket_attachments_storage_delete on storage.objects;
create policy ticket_attachments_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ticket-attachments'
  and (
    owner = auth.uid()
    or public.is_global_admin()
    or exists(
      select 1
      from public.tickets t
      where t.id = split_part(name, '/', 2)::uuid
        and (
          (t.ticket_type <> 'customer_service' and public.can_work_tickets())
          or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
        )
    )
  )
);

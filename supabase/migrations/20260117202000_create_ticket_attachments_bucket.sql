-- Create the ticket-attachments storage bucket if it doesn't exist
-- This uses the storage schema directly

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments', 
  'ticket-attachments', 
  false,
  52428800, -- 50MB limit
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Recreate RLS policies for the bucket
drop policy if exists "ticket_attachments_select" on storage.objects;
create policy "ticket_attachments_select"
on storage.objects for select
to authenticated
using (bucket_id = 'ticket-attachments');

drop policy if exists "ticket_attachments_insert" on storage.objects;
create policy "ticket_attachments_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'ticket-attachments');

drop policy if exists "ticket_attachments_update" on storage.objects;
create policy "ticket_attachments_update"
on storage.objects for update
to authenticated
using (bucket_id = 'ticket-attachments' and owner = auth.uid());

drop policy if exists "ticket_attachments_delete" on storage.objects;
create policy "ticket_attachments_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'ticket-attachments' and owner = auth.uid());

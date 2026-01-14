create extension if not exists pgcrypto;

create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete restrict,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_attachments_ticket_id_idx on public.ticket_attachments (ticket_id);
create index if not exists ticket_attachments_uploader_id_idx on public.ticket_attachments (uploader_id);

alter table public.ticket_attachments enable row level security;

drop policy if exists ticket_attachments_select on public.ticket_attachments;
create policy ticket_attachments_select
on public.ticket_attachments
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_attachments.ticket_id
  )
);

drop policy if exists ticket_attachments_insert on public.ticket_attachments;
create policy ticket_attachments_insert
on public.ticket_attachments
for insert
to authenticated
with check (
  uploader_id = auth.uid()
  and exists(
    select 1
    from public.tickets t
    where t.id = ticket_attachments.ticket_id
  )
);

drop policy if exists ticket_attachments_delete on public.ticket_attachments;
create policy ticket_attachments_delete
on public.ticket_attachments
for delete
to authenticated
using (
  public.is_global_admin()
  or uploader_id = auth.uid()
);

-- Store external requester identity for email-ingested tickets

alter table public.tickets
  add column if not exists requester_email text;

alter table public.tickets
  add column if not exists requester_name text;

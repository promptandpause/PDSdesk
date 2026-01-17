-- Fix email_queue table to allow nullable body_html and body_text (templates are used instead)

alter table public.email_queue 
  alter column body_html drop not null,
  alter column body_text drop not null;

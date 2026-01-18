-- Manually trigger sending of pending emails

-- Check how many emails are pending
select 
  count(*) as pending_count,
  min(created_at) as oldest_pending
from public.email_queue 
where sent_at is null;

-- This will be processed by the send-emails function when called

-- Debug email processing issues

-- Check if inbound emails are being processed
SELECT 
  ie.id,
  ie.from_email,
  ie.subject,
  ie.status,
  ie.error_message,
  ie.created_at
FROM public.inbound_emails ie
ORDER BY ie.created_at DESC
LIMIT 10;

-- Check if comments are being created from emails
SELECT 
  tc.id,
  tc.ticket_id,
  tc.body,
  tc.is_internal,
  tc.created_at,
  t.ticket_number,
  t.ticket_type
FROM public.ticket_comments tc
JOIN public.tickets t ON t.id = tc.ticket_id
WHERE tc.body LIKE '%Email reply from%'
ORDER BY tc.created_at DESC
LIMIT 5;

-- Check recent customer service tickets
SELECT 
  id,
  ticket_number,
  requester_email,
  status,
  updated_at
FROM public.tickets
WHERE ticket_type = 'customer_service'
ORDER BY updated_at DESC
LIMIT 5;

-- Fix email routing to monitor support@ mailbox for customer replies

-- Option 1: Update mailbox to monitor support@ instead
UPDATE public.email_config 
SET config_value = 'support@promptandpause.com'
WHERE config_key = 'ms_mailbox_email';

-- Option 2: Add second mailbox monitoring (uncomment if needed)
-- INSERT INTO public.email_config (config_key, config_value, is_encrypted)
-- VALUES ('ms_mailbox_email_2', 'support@promptandpause.com', false)
-- ON CONFLICT (config_key) DO UPDATE SET
--   config_value = EXCLUDED.config_value;

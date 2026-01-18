-- Switch to Resend for email delivery to avoid Microsoft IP blocking issues

-- Update email configuration to use Resend
UPDATE public.email_config 
SET config_value = 'true'
WHERE config_key = 'use_resend';

-- Ensure Resend API key is configured
INSERT INTO public.email_config (config_key, config_value, is_encrypted)
VALUES ('resend_api_key', '', true)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  is_encrypted = EXCLUDED.is_encrypted;

-- Set default from email for Resend
INSERT INTO public.email_config (config_key, config_value, is_encrypted)
VALUES ('resend_from_email', 'support@promptandpause.com', false)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  is_encrypted = EXCLUDED.is_encrypted;

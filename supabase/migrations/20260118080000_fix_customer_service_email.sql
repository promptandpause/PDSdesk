-- Fix customer service email configuration
-- All customer service tickets should use support@promptandpause.com

-- Update system settings for customer service
update public.system_settings 
set value = 'support@promptandpause.com' 
where key = 'email_reply_to';

-- Also update the default from address for consistency
update public.system_settings 
set value = 'support@promptandpause.com' 
where key = 'email_from_address';

-- Update the from name to be more generic
update public.system_settings 
set value = 'Prompt & Pause Support' 
where key = 'email_from_name';

-- Ensure the operator group for customer service has the correct email
update public.operator_groups 
set email_address = 'support@promptandpause.com' 
where group_key = 'servicedesk-queue' or name ilike '%service desk%';

-- Also update any customer service specific operator groups
update public.operator_groups 
set email_address = 'support@promptandpause.com' 
where name ilike '%customer service%' or name ilike '%customer%';

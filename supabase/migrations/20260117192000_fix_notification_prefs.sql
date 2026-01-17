-- Fix user_notification_preferences table and wants_email_notification function

-- Ensure columns exist
alter table public.user_notification_preferences 
  add column if not exists email_ticket_created boolean not null default true,
  add column if not exists email_ticket_updated boolean not null default true,
  add column if not exists email_ticket_resolved boolean not null default true,
  add column if not exists email_ticket_closed boolean not null default true,
  add column if not exists inapp_notifications boolean not null default true;

-- Fix the wants_email_notification function to handle missing columns gracefully
create or replace function public.wants_email_notification(
  p_user_id uuid,
  p_notification_type text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result boolean;
begin
  -- Try to get the specific preference
  case p_notification_type
    when 'ticket_created' then
      select email_ticket_created into v_result
      from public.user_notification_preferences
      where user_id = p_user_id;
    when 'ticket_updated' then
      select email_ticket_updated into v_result
      from public.user_notification_preferences
      where user_id = p_user_id;
    when 'ticket_resolved' then
      select email_ticket_resolved into v_result
      from public.user_notification_preferences
      where user_id = p_user_id;
    when 'ticket_closed' then
      select email_ticket_closed into v_result
      from public.user_notification_preferences
      where user_id = p_user_id;
    else
      v_result := true;
  end case;
  
  -- Default to true if no preference found
  return coalesce(v_result, true);
end;
$$;

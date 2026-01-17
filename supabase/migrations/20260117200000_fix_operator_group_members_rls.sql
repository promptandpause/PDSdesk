-- Fix operator_group_members RLS policy - allow authenticated users to query memberships
-- This is needed for queue access checks in QueuePage.tsx

-- Drop existing restrictive policy
drop policy if exists operator_group_members_select on public.operator_group_members;

-- Create new permissive policy - membership data is not sensitive
-- All authenticated users can see group memberships
create policy operator_group_members_select
on public.operator_group_members
for select
to authenticated
using (true);

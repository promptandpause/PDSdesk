-- Service Catalog for PDSdesk
-- Categories: IT, HR, Bugs, Procedures & Standards, Projects, Departments

-- Drop existing service_catalog_items table if it has wrong schema
drop table if exists public.service_catalog_items cascade;

-- ============================================
-- 1. SERVICE CATALOG CATEGORIES
-- ============================================
create table if not exists public.service_catalog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text default '📋',
  color text default '#6366f1',
  display_order int default 0,
  is_active boolean default true,
  parent_category_id uuid references public.service_catalog_categories(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 2. SERVICE CATALOG ITEMS (Request Types)
-- ============================================
create table if not exists public.service_catalog_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_catalog_categories(id) on delete cascade,
  name text not null,
  description text,
  icon text default '📝',
  estimated_time text, -- e.g., "1-2 business days"
  requires_approval boolean default false,
  approval_group_id uuid references public.operator_groups(id),
  default_priority text default 'medium',
  default_operator_group_id uuid references public.operator_groups(id),
  form_schema jsonb default '[]', -- Custom form fields
  is_active boolean default true,
  display_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 3. SERVICE CATALOG REQUESTS (Submitted by users)
-- ============================================
create table if not exists public.service_catalog_requests (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references public.service_catalog_items(id),
  requester_id uuid not null references public.profiles(id),
  ticket_id uuid references public.tickets(id),
  form_data jsonb default '{}',
  status text default 'pending', -- pending, approved, rejected, completed
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 4. DEPARTMENTS (synced from Azure AD)
-- ============================================
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  manager_id uuid references public.profiles(id),
  is_active boolean default true,
  synced_from_azure boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- INSERT DEFAULT CATEGORIES
-- ============================================
insert into public.service_catalog_categories (id, name, description, icon, color, display_order) values
  ('10000000-0000-0000-0000-000000000001', 'IT Services', 'Information Technology support and services', '💻', '#3b82f6', 1),
  ('10000000-0000-0000-0000-000000000002', 'HR Services', 'Human Resources requests and inquiries', '👥', '#10b981', 2),
  ('10000000-0000-0000-0000-000000000003', 'Bug Reports', 'Report software bugs and issues', '🐛', '#ef4444', 3),
  ('10000000-0000-0000-0000-000000000004', 'Procedures & Standards', 'Request policy updates or clarifications', '📋', '#8b5cf6', 4),
  ('10000000-0000-0000-0000-000000000005', 'Projects', 'Project-related requests and resources', '📊', '#f59e0b', 5),
  ('10000000-0000-0000-0000-000000000006', 'Departments', 'Department-specific requests', '🏢', '#6366f1', 6)
on conflict (id) do nothing;

-- ============================================
-- INSERT DEFAULT IT SERVICE ITEMS
-- ============================================
insert into public.service_catalog_items (id, category_id, name, description, icon, estimated_time, default_priority, form_schema, display_order) values
  -- IT Services
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'New User Account', 'Request a new user account for an employee', '👤', '1-2 business days', 'medium', 
   '[{"name": "employee_name", "label": "Employee Full Name", "type": "text", "required": true}, {"name": "employee_email", "label": "Employee Email", "type": "email", "required": true}, {"name": "department", "label": "Department", "type": "select", "required": true, "options": "departments"}, {"name": "start_date", "label": "Start Date", "type": "date", "required": true}, {"name": "manager", "label": "Manager Name", "type": "text", "required": true}]', 1),
  
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Password Reset', 'Reset your password or unlock account', '🔑', '15-30 minutes', 'high',
   '[{"name": "username", "label": "Username/Email", "type": "text", "required": true}, {"name": "reason", "label": "Reason for Reset", "type": "select", "required": true, "options": ["Forgot password", "Account locked", "Security concern", "Other"]}]', 2),
  
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Software Installation', 'Request software to be installed on your device', '📦', '1-3 business days', 'medium',
   '[{"name": "software_name", "label": "Software Name", "type": "text", "required": true}, {"name": "business_justification", "label": "Business Justification", "type": "textarea", "required": true}, {"name": "device_name", "label": "Device Name/Asset Tag", "type": "text", "required": false}]', 3),
  
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Hardware Request', 'Request new hardware (laptop, monitor, peripherals)', '🖥️', '3-5 business days', 'medium',
   '[{"name": "hardware_type", "label": "Hardware Type", "type": "select", "required": true, "options": ["Laptop", "Desktop", "Monitor", "Keyboard", "Mouse", "Headset", "Docking Station", "Other"]}, {"name": "business_justification", "label": "Business Justification", "type": "textarea", "required": true}, {"name": "urgency", "label": "Urgency", "type": "select", "required": true, "options": ["Standard", "Urgent - New Hire", "Urgent - Replacement"]}]', 4),
  
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'VPN Access', 'Request VPN access for remote work', '🔒', '1 business day', 'medium',
   '[{"name": "reason", "label": "Reason for VPN Access", "type": "textarea", "required": true}, {"name": "duration", "label": "Duration Needed", "type": "select", "required": true, "options": ["Permanent", "Temporary - 1 week", "Temporary - 1 month", "Temporary - 3 months"]}]', 5),
  
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Email Distribution List', 'Create or modify email distribution lists', '📧', '1-2 business days', 'low',
   '[{"name": "action", "label": "Action", "type": "select", "required": true, "options": ["Create new list", "Add members", "Remove members", "Delete list"]}, {"name": "list_name", "label": "Distribution List Name", "type": "text", "required": true}, {"name": "members", "label": "Members (one per line)", "type": "textarea", "required": false}]', 6),
  
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'Shared Drive Access', 'Request access to shared drives or folders', '📁', '1 business day', 'medium',
   '[{"name": "drive_path", "label": "Drive/Folder Path", "type": "text", "required": true}, {"name": "access_level", "label": "Access Level", "type": "select", "required": true, "options": ["Read only", "Read/Write", "Full control"]}, {"name": "justification", "label": "Business Justification", "type": "textarea", "required": true}]', 7),
  
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 'Printer Setup', 'Add or configure a printer', '🖨️', '1 business day', 'low',
   '[{"name": "printer_name", "label": "Printer Name/Location", "type": "text", "required": true}, {"name": "issue", "label": "Issue or Request", "type": "textarea", "required": true}]', 8),

  -- HR Services
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', 'Leave Request', 'Submit a leave or time-off request', '🏖️', '1-2 business days', 'medium',
   '[{"name": "leave_type", "label": "Leave Type", "type": "select", "required": true, "options": ["Annual Leave", "Sick Leave", "Personal Leave", "Bereavement", "Parental Leave", "Unpaid Leave"]}, {"name": "start_date", "label": "Start Date", "type": "date", "required": true}, {"name": "end_date", "label": "End Date", "type": "date", "required": true}, {"name": "notes", "label": "Additional Notes", "type": "textarea", "required": false}]', 1),
  
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', 'Payroll Inquiry', 'Questions about payroll, deductions, or payments', '💰', '1-3 business days', 'medium',
   '[{"name": "inquiry_type", "label": "Inquiry Type", "type": "select", "required": true, "options": ["Payslip question", "Tax deduction", "Bank details update", "Bonus/Commission", "Other"]}, {"name": "details", "label": "Details", "type": "textarea", "required": true}]', 2),
  
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', 'Benefits Enrollment', 'Enroll or modify benefits', '🏥', '3-5 business days', 'medium',
   '[{"name": "benefit_type", "label": "Benefit Type", "type": "select", "required": true, "options": ["Health Insurance", "Dental", "Vision", "Life Insurance", "Retirement/401k", "Other"]}, {"name": "action", "label": "Action", "type": "select", "required": true, "options": ["New enrollment", "Change coverage", "Add dependent", "Remove coverage"]}, {"name": "details", "label": "Details", "type": "textarea", "required": true}]', 3),
  
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', 'Employee Onboarding', 'New employee onboarding request', '🎉', '3-5 business days', 'high',
   '[{"name": "employee_name", "label": "New Employee Name", "type": "text", "required": true}, {"name": "position", "label": "Position/Title", "type": "text", "required": true}, {"name": "department", "label": "Department", "type": "select", "required": true, "options": "departments"}, {"name": "start_date", "label": "Start Date", "type": "date", "required": true}, {"name": "manager", "label": "Reporting Manager", "type": "text", "required": true}]', 4),
  
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000002', 'Employee Offboarding', 'Employee departure/offboarding request', '👋', '1-2 business days', 'high',
   '[{"name": "employee_name", "label": "Employee Name", "type": "text", "required": true}, {"name": "last_day", "label": "Last Working Day", "type": "date", "required": true}, {"name": "reason", "label": "Reason for Departure", "type": "select", "required": true, "options": ["Resignation", "Termination", "Retirement", "Contract end", "Other"]}, {"name": "notes", "label": "Additional Notes", "type": "textarea", "required": false}]', 5),
  
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000002', 'Training Request', 'Request training or professional development', '📚', '5-10 business days', 'low',
   '[{"name": "training_name", "label": "Training/Course Name", "type": "text", "required": true}, {"name": "provider", "label": "Training Provider", "type": "text", "required": false}, {"name": "cost", "label": "Estimated Cost", "type": "text", "required": false}, {"name": "justification", "label": "Business Justification", "type": "textarea", "required": true}]', 6),

  -- Bug Reports
  ('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000003', 'Application Bug', 'Report a bug in a business application', '🐛', '1-5 business days', 'medium',
   '[{"name": "application", "label": "Application Name", "type": "text", "required": true}, {"name": "description", "label": "Bug Description", "type": "textarea", "required": true}, {"name": "steps_to_reproduce", "label": "Steps to Reproduce", "type": "textarea", "required": true}, {"name": "expected_behavior", "label": "Expected Behavior", "type": "textarea", "required": true}, {"name": "actual_behavior", "label": "Actual Behavior", "type": "textarea", "required": true}, {"name": "severity", "label": "Severity", "type": "select", "required": true, "options": ["Critical - System down", "High - Major feature broken", "Medium - Feature impaired", "Low - Minor issue"]}]', 1),
  
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000003', 'Website Issue', 'Report an issue with company websites', '🌐', '1-3 business days', 'medium',
   '[{"name": "website_url", "label": "Website URL", "type": "text", "required": true}, {"name": "browser", "label": "Browser Used", "type": "select", "required": true, "options": ["Chrome", "Firefox", "Safari", "Edge", "Other"]}, {"name": "description", "label": "Issue Description", "type": "textarea", "required": true}, {"name": "screenshot", "label": "Screenshot URL (if available)", "type": "text", "required": false}]', 2),

  -- Procedures & Standards
  ('20000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000004', 'Policy Clarification', 'Request clarification on company policies', '📖', '2-3 business days', 'low',
   '[{"name": "policy_name", "label": "Policy Name/Topic", "type": "text", "required": true}, {"name": "question", "label": "Your Question", "type": "textarea", "required": true}]', 1),
  
  ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000004', 'Process Improvement', 'Suggest improvements to existing processes', '💡', '5-10 business days', 'low',
   '[{"name": "process_name", "label": "Process Name", "type": "text", "required": true}, {"name": "current_issue", "label": "Current Issue/Pain Point", "type": "textarea", "required": true}, {"name": "proposed_solution", "label": "Proposed Improvement", "type": "textarea", "required": true}, {"name": "expected_benefit", "label": "Expected Benefit", "type": "textarea", "required": true}]', 2),
  
  ('20000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000004', 'Compliance Question', 'Questions about compliance and regulations', '⚖️', '1-3 business days', 'medium',
   '[{"name": "topic", "label": "Compliance Topic", "type": "text", "required": true}, {"name": "question", "label": "Your Question", "type": "textarea", "required": true}, {"name": "urgency", "label": "Urgency", "type": "select", "required": true, "options": ["Standard", "Urgent - Audit related", "Urgent - Legal matter"]}]', 3),

  -- Projects
  ('20000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000005', 'New Project Request', 'Request to initiate a new project', '🚀', '5-10 business days', 'medium',
   '[{"name": "project_name", "label": "Project Name", "type": "text", "required": true}, {"name": "description", "label": "Project Description", "type": "textarea", "required": true}, {"name": "business_case", "label": "Business Case/Justification", "type": "textarea", "required": true}, {"name": "estimated_budget", "label": "Estimated Budget", "type": "text", "required": false}, {"name": "target_date", "label": "Target Completion Date", "type": "date", "required": false}, {"name": "stakeholders", "label": "Key Stakeholders", "type": "textarea", "required": true}]', 1),
  
  ('20000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000005', 'Project Resource Request', 'Request additional resources for a project', '👷', '3-5 business days', 'medium',
   '[{"name": "project_name", "label": "Project Name", "type": "text", "required": true}, {"name": "resource_type", "label": "Resource Type", "type": "select", "required": true, "options": ["Personnel", "Budget", "Equipment", "Software", "Other"]}, {"name": "details", "label": "Resource Details", "type": "textarea", "required": true}, {"name": "justification", "label": "Justification", "type": "textarea", "required": true}]', 2),
  
  ('20000000-0000-0000-0000-000000000042', '10000000-0000-0000-0000-000000000005', 'Project Status Update', 'Submit a project status update', '📈', 'Immediate', 'low',
   '[{"name": "project_name", "label": "Project Name", "type": "text", "required": true}, {"name": "status", "label": "Current Status", "type": "select", "required": true, "options": ["On Track", "At Risk", "Delayed", "Completed", "On Hold"]}, {"name": "progress", "label": "Progress Summary", "type": "textarea", "required": true}, {"name": "blockers", "label": "Blockers/Issues", "type": "textarea", "required": false}, {"name": "next_steps", "label": "Next Steps", "type": "textarea", "required": true}]', 3),

  -- General Request
  ('20000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000006', 'General Request', 'Submit a general request to your department', '📝', '2-5 business days', 'medium',
   '[{"name": "department", "label": "Department", "type": "select", "required": true, "options": "departments"}, {"name": "subject", "label": "Subject", "type": "text", "required": true}, {"name": "description", "label": "Description", "type": "textarea", "required": true}]', 1)
on conflict (id) do nothing;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Categories: everyone can view, only admins can modify
alter table public.service_catalog_categories enable row level security;

create policy service_catalog_categories_select on public.service_catalog_categories
  for select to authenticated using (true);

create policy service_catalog_categories_all on public.service_catalog_categories
  for all to authenticated using (public.is_global_admin());

-- Items: everyone can view active items, only admins can modify
alter table public.service_catalog_items enable row level security;

create policy service_catalog_items_select on public.service_catalog_items
  for select to authenticated using (is_active = true or public.is_global_admin());

create policy service_catalog_items_all on public.service_catalog_items
  for all to authenticated using (public.is_global_admin());

-- Requests: users can view their own, admins can view all
alter table public.service_catalog_requests enable row level security;

create policy service_catalog_requests_select on public.service_catalog_requests
  for select to authenticated using (
    requester_id = auth.uid() or 
    public.is_global_admin() or 
    public.has_role('service_desk_admin')
  );

create policy service_catalog_requests_insert on public.service_catalog_requests
  for insert to authenticated with check (requester_id = auth.uid());

create policy service_catalog_requests_update on public.service_catalog_requests
  for update to authenticated using (
    public.is_global_admin() or 
    public.has_role('service_desk_admin')
  );

-- Departments: everyone can view, only admins can modify
alter table public.departments enable row level security;

create policy departments_select on public.departments
  for select to authenticated using (true);

create policy departments_all on public.departments
  for all to authenticated using (public.is_global_admin());

-- ============================================
-- INDEXES
-- ============================================
create index if not exists service_catalog_categories_display_order_idx on public.service_catalog_categories(display_order);
create index if not exists service_catalog_items_category_id_idx on public.service_catalog_items(category_id);
create index if not exists service_catalog_items_display_order_idx on public.service_catalog_items(display_order);
create index if not exists service_catalog_requests_requester_id_idx on public.service_catalog_requests(requester_id);
create index if not exists service_catalog_requests_ticket_id_idx on public.service_catalog_requests(ticket_id);
create index if not exists departments_name_idx on public.departments(name);

-- ============================================
-- TRIGGERS
-- ============================================
create trigger service_catalog_categories_updated_at
  before update on public.service_catalog_categories
  for each row execute function public.update_updated_at_column();

create trigger service_catalog_items_updated_at
  before update on public.service_catalog_items
  for each row execute function public.update_updated_at_column();

create trigger service_catalog_requests_updated_at
  before update on public.service_catalog_requests
  for each row execute function public.update_updated_at_column();

create trigger departments_updated_at
  before update on public.departments
  for each row execute function public.update_updated_at_column();

-- ============================================
-- FUNCTION: Sync departments from directory_users
-- ============================================
create or replace function public.sync_departments_from_directory()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dept text;
  v_count int := 0;
begin
  -- Check if caller is admin
  if not public.is_global_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Get unique departments from directory_users
  for v_dept in 
    select distinct department 
    from public.directory_users 
    where department is not null and department != ''
  loop
    insert into public.departments (name, synced_from_azure)
    values (v_dept, true)
    on conflict (name) do update set synced_from_azure = true;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'synced_count', v_count);
end;
$$;

grant execute on function public.sync_departments_from_directory() to authenticated;

-- ============================================
-- FUNCTION: Submit service catalog request and create ticket
-- ============================================
create or replace function public.submit_service_catalog_request(
  p_catalog_item_id uuid,
  p_form_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_catalog_item record;
  v_category record;
  v_request_id uuid;
  v_ticket_id uuid;
  v_ticket_number text;
  v_title text;
  v_description text;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  -- Get catalog item
  select * into v_catalog_item
  from public.service_catalog_items
  where id = p_catalog_item_id and is_active = true;

  if v_catalog_item is null then
    return jsonb_build_object('ok', false, 'error', 'Catalog item not found');
  end if;

  -- Get category
  select * into v_category
  from public.service_catalog_categories
  where id = v_catalog_item.category_id;

  -- Build ticket title and description
  v_title := v_category.name || ': ' || v_catalog_item.name;
  v_description := 'Service Catalog Request: ' || v_catalog_item.name || E'\n\n';
  v_description := v_description || 'Category: ' || v_category.name || E'\n';
  v_description := v_description || 'Estimated Time: ' || coalesce(v_catalog_item.estimated_time, 'Not specified') || E'\n\n';
  v_description := v_description || 'Form Data:' || E'\n' || jsonb_pretty(p_form_data);

  -- Generate ticket number
  select 'TKT-' || lpad((coalesce(max(substring(ticket_number from 5)::int), 0) + 1)::text, 6, '0')
  into v_ticket_number
  from public.tickets;

  -- Create ticket
  insert into public.tickets (
    ticket_number,
    title,
    description,
    status,
    priority,
    requester_id,
    created_by,
    operator_group_id,
    source
  ) values (
    v_ticket_number,
    v_title,
    v_description,
    'open',
    v_catalog_item.default_priority,
    v_user_id,
    v_user_id,
    v_catalog_item.default_operator_group_id,
    'service_catalog'
  )
  returning id into v_ticket_id;

  -- Create service catalog request record
  insert into public.service_catalog_requests (
    catalog_item_id,
    requester_id,
    ticket_id,
    form_data,
    status
  ) values (
    p_catalog_item_id,
    v_user_id,
    v_ticket_id,
    p_form_data,
    case when v_catalog_item.requires_approval then 'pending' else 'approved' end
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'ticket_id', v_ticket_id,
    'ticket_number', v_ticket_number
  );
end;
$$;

grant execute on function public.submit_service_catalog_request(uuid, jsonb) to authenticated;

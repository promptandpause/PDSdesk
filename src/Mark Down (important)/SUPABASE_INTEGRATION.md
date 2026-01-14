# PDSdesk Supabase Integration Checklist

This document outlines all areas where mock/hardcoded data needs to be replaced with Supabase integration.

**📌 IMPORTANT REFERENCES:**

- **Microsoft User Sync & Storage:** See `/MICROSOFT_USER_SYNC.md` for detailed Azure AD integration and storage bucket configuration
- **Ticket Queue System:** See `/TICKET_QUEUE_UPDATE.md` for incident queue and notification system details

---

## Authentication & User Management

### Microsoft SSO (Azure AD)

- **Location**: `/App.tsx`
- **Current**: Mock user object
- **Required**:
  - Supabase Auth with Azure AD provider
  - **Automatic user sync from Microsoft Graph API** (See `/MICROSOFT_USER_SYNC.md`)
  - User profile data (name, email, role, initials, department, manager)
  - Session management
  - Role-based access control (operator, manager, admin)

### User Database Table (Enhanced)

```sql
users (
  id uuid primary key,
  azure_ad_id text unique,  -- NEW: Microsoft Azure AD user ID
  email text unique,
  first_name text,
  surname text,
  display_name text,         -- NEW: From Microsoft
  initials text,
  role text,
  job_title text,            -- NEW: From Microsoft
  department text,           -- NEW: From Microsoft
  office_location text,      -- NEW: From Microsoft
  mobile_phone text,         -- NEW: From Microsoft
  business_phone text,       -- NEW: From Microsoft
  employee_id text,          -- NEW: From Microsoft
  manager_id uuid references users(id),  -- NEW: Manager hierarchy
  avatar_url text,
  is_active boolean default true,
  operator_group_id uuid references operator_groups(id),
  can_raise_tickets boolean default true,
  notification_preferences jsonb,
  created_at timestamp,
  updated_at timestamp,
  last_login timestamp       -- NEW: Track last login
)
```

---

## Storage Buckets

### **1. Ticket Attachments**

- **Bucket Name**: `ticket-attachments`
- **Location**: `/components/views/TicketDetailView.tsx` (ATTACHMENTS tab)
- **Current**: Mock file upload with local state
- **Required**:
  - File upload to Supabase Storage
  - Signed URLs for secure access
  - File type validation (images, PDFs, documents)
  - Max file size: 10MB per file
  - Storage path: `{incident_id}/{filename}`
  - See `/MICROSOFT_USER_SYNC.md` for full implementation

**Database Table:**

```sql
incident_attachments (
  id uuid primary key,
  incident_id uuid references incidents(id) on delete cascade,
  file_name text,
  file_path text,
  file_size bigint,
  file_type text,
  uploaded_by uuid references users(id),
  created_at timestamp
)
```

### **2. User Avatars**

- **Bucket Name**: `avatars`
- **Public**: Yes
- **Storage path**: `{user_id}/{filename}`

### **3. Knowledge Base Attachments**

- **Bucket Name**: `knowledge-base`
- **For KB articles and documentation**

---

## Dashboard Module

### KPI Widget

- **Location**: `/components/dashboard/KPIWidget.tsx`
- **Current**: Hardcoded KPI values (logged: 3, solved: 1)
- **Required**:
  - Real-time KPI calculations from incident data
  - User-configurable min/max/norm thresholds
  - Database table: `kpi_thresholds`, `kpi_history`

### Report/KPI Widget

- **Location**: `/components/dashboard/ReportKPIWidget.tsx`
- **Current**: Hardcoded KPI metrics and pie chart data
- **Required**:
  - Dynamic report data
  - Database table: `reports`, `kpi_metrics`

### Selections Widget

- **Location**: `/components/dashboard/SelectionsWidget.tsx`
- **Current**: Mock selection data
- **Required**:
  - Saved user selections/filters
  - Database table: `user_selections`

### Reports List Widget

- **Location**: `/components/dashboard/ReportsListWidget.tsx`
- **Current**: Mock report list
- **Required**:
  - User's saved reports
  - Database table: `saved_reports`

### Navigator Panel

- **Location**: `/components/dashboard/NavigatorPanel.tsx`
- **Current**: Hardcoded dashboard/module list
- **Required**:
  - User's accessible modules based on permissions
  - Custom dashboard configurations

## Call Management Module

### Incidents/Tickets

- **Location**: `/components/views/CallManagementView.tsx`, `/components/views/TicketDetailView.tsx`
- **Current**: Mock ticket data (4 hardcoded tickets)
- **Required**:
  - CRUD operations for incidents
  - Real-time updates
  - File attachments
  - Audit trail
  - Time registration
  - SLA tracking

### Incidents Database Tables

```sql
incidents (
  id uuid primary key,
  number text unique,
  subject text,
  description text,
  caller_id uuid references users(id),
  status text,
  priority text,
  category text,
  subcategory text,
  operator_id uuid references users(id),
  operator_group_id uuid references operator_groups(id),
  created_at timestamp,
  updated_at timestamp,
  target_date timestamp,
  closed_at timestamp,
  on_hold boolean,
  external_number text
)

incident_messages (
  id uuid primary key,
  incident_id uuid references incidents(id),
  user_id uuid references users(id),
  message text,
  is_internal boolean,
  created_at timestamp
)

incident_attachments (
  id uuid primary key,
  incident_id uuid references incidents(id),
  file_name text,
  file_url text,
  uploaded_by uuid references users(id),
  uploaded_at timestamp
)

incident_audit_trail (
  id uuid primary key,
  incident_id uuid references incidents(id),
  user_id uuid references users(id),
  action text,
  old_value text,
  new_value text,
  changed_at timestamp
)

time_registrations (
  id uuid primary key,
  incident_id uuid references incidents(id),
  user_id uuid references users(id),
  duration_minutes integer,
  description text,
  registered_at timestamp
)
```

## Person Management

### Person Forms

- **Location**: `/components/views/PersonFormView.tsx`
- **Current**: Mock person data
- **Required**:
  - CRUD operations for persons/callers
  - Profile picture upload to Supabase Storage
  - Contact details
  - Department/Branch associations

### Person Database Tables

```sql
persons (
  id uuid primary key,
  user_id uuid references users(id),
  surname text,
  first_name text,
  initials text,
  prefixes text,
  birth_name text,
  title text,
  gender text,
  language text,
  telephone text,
  mobile_number text,
  fax_number text,
  email text,
  avatar_url text,
  branch_id uuid references branches(id),
  department_id uuid references departments(id),
  job_title text,
  created_at timestamp,
  updated_at timestamp
)

branches (
  id uuid primary key,
  name text,
  address text,
  created_at timestamp
)

departments (
  id uuid primary key,
  name text,
  branch_id uuid references branches(id),
  created_at timestamp
)
```

## Task Board Module

### Tasks

- **Location**: `/components/views/TaskBoardView.tsx`
- **Current**: Mock task data (12 hardcoded tasks)
- **Required**:
  - CRUD operations for tasks
  - Task assignments
  - Status updates
  - Real-time collaboration

### Tasks Database Table

```sql
tasks (
  id uuid primary key,
  title text,
  description text,
  status text,
  priority text,
  assigned_to uuid references users(id),
  due_date timestamp,
  created_by uuid references users(id),
  tags text[],
  created_at timestamp,
  updated_at timestamp
)

task_comments (
  id uuid primary key,
  task_id uuid references tasks(id),
  user_id uuid references users(id),
  comment text,
  created_at timestamp
)
```

## Kanban Board Module

### Kanban Cards

- **Location**: `/components/views/KanbanBoardView.tsx`
- **Current**: Mock kanban data (6 cards across 3 columns)
- **Required**:
  - CRUD operations
  - Drag-and-drop state persistence
  - Column customization
  - Real-time updates

### Kanban Database Tables

```sql
kanban_boards (
  id uuid primary key,
  name text,
  created_by uuid references users(id),
  created_at timestamp
)

kanban_columns (
  id uuid primary key,
  board_id uuid references kanban_boards(id),
  name text,
  position integer,
  created_at timestamp
)

kanban_cards (
  id uuid primary key,
  column_id uuid references kanban_columns(id),
  title text,
  description text,
  position integer,
  assigned_to uuid references users(id),
  due_date timestamp,
  tags text[],
  created_at timestamp,
  updated_at timestamp
)
```

## Asset Management Module

### Assets

- **Required**:
  - Asset inventory
  - Asset assignments to users
  - Maintenance records
  - Depreciation tracking

### Assets Database Tables

```sql
assets (
  id uuid primary key,
  asset_number text unique,
  name text,
  description text,
  category text,
  manufacturer text,
  model text,
  serial_number text,
  purchase_date date,
  purchase_price decimal,
  assigned_to uuid references persons(id),
  location text,
  status text,
  created_at timestamp,
  updated_at timestamp
)

asset_maintenance (
  id uuid primary key,
  asset_id uuid references assets(id),
  maintenance_date date,
  description text,
  cost decimal,
  performed_by uuid references users(id),
  created_at timestamp
)
```

## Knowledge Base Module

### Articles

- **Required**:
  - Knowledge articles CRUD
  - Categories/Tags
  - Search functionality
  - View/Like tracking

### Knowledge Base Database Tables

```sql
kb_categories (
  id uuid primary key,
  name text,
  parent_id uuid references kb_categories(id),
  created_at timestamp
)

kb_articles (
  id uuid primary key,
  title text,
  content text,
  category_id uuid references kb_categories(id),
  author_id uuid references users(id),
  status text,
  views integer default 0,
  likes integer default 0,
  created_at timestamp,
  updated_at timestamp,
  published_at timestamp
)

kb_article_tags (
  article_id uuid references kb_articles(id),
  tag text,
  primary key (article_id, tag)
)
```

## Change Management Module

### Change Requests

- **Required**:
  - Change request lifecycle
  - Approval workflows
  - Impact assessments
  - Implementation tracking

### Change Management Database Tables

```sql
change_requests (
  id uuid primary key,
  number text unique,
  title text,
  description text,
  type text,
  priority text,
  status text,
  requester_id uuid references users(id),
  assigned_to uuid references users(id),
  planned_start timestamp,
  planned_end timestamp,
  actual_start timestamp,
  actual_end timestamp,
  risk_level text,
  impact text,
  created_at timestamp,
  updated_at timestamp
)

change_approvals (
  id uuid primary key,
  change_request_id uuid references change_requests(id),
  approver_id uuid references users(id),
  status text,
  comments text,
  approved_at timestamp
)
```

## Problem Management Module

### Problems

- **Required**:
  - Problem records
  - Root cause analysis
  - Linked incidents
  - Workarounds

### Problem Management Database Tables

```sql
problems (
  id uuid primary key,
  number text unique,
  title text,
  description text,
  status text,
  priority text,
  category text,
  assigned_to uuid references users(id),
  root_cause text,
  workaround text,
  created_at timestamp,
  updated_at timestamp,
  resolved_at timestamp
)

problem_incidents (
  problem_id uuid references problems(id),
  incident_id uuid references incidents(id),
  primary key (problem_id, incident_id)
)
```

## Operator Groups & Categories

### Reference Data

- **Required**:
  - Operator groups
  - Categories/Subcategories
  - Priorities
  - Statuses

### Reference Tables

```sql
operator_groups (
  id uuid primary key,
  name text,
  description text,
  email text,
  created_at timestamp
)

operator_group_members (
  group_id uuid references operator_groups(id),
  user_id uuid references users(id),
  primary key (group_id, user_id)
)

categories (
  id uuid primary key,
  name text,
  module text,
  parent_id uuid references categories(id),
  created_at timestamp
)

priorities (
  id uuid primary key,
  name text,
  level integer,
  response_time_hours integer,
  created_at timestamp
)
```

## SLA Management

### SLA Tracking

- **Required**:
  - SLA definitions
  - Response/Resolution time tracking
  - Escalation rules
  - Breach notifications

### SLA Database Tables

```sql
sla_definitions (
  id uuid primary key,
  name text,
  description text,
  priority_id uuid references priorities(id),
  response_time_hours integer,
  resolution_time_hours integer,
  created_at timestamp
)

sla_tracking (
  id uuid primary key,
  incident_id uuid references incidents(id),
  sla_id uuid references sla_definitions(id),
  response_target timestamp,
  resolution_target timestamp,
  response_actual timestamp,
  resolution_actual timestamp,
  is_breached boolean,
  created_at timestamp
)
```

## Reservations Management

### Reservations

- **Required**:
  - Resource booking (rooms, equipment)
  - Availability checking
  - Reservation approvals

### Reservations Database Tables

```sql
resources (
  id uuid primary key,
  name text,
  type text,
  capacity integer,
  location text,
  available boolean default true,
  created_at timestamp
)

reservations (
  id uuid primary key,
  resource_id uuid references resources(id),
  requester_id uuid references users(id),
  start_time timestamp,
  end_time timestamp,
  status text,
  purpose text,
  created_at timestamp
)
```

## Quick Launch Bar

### Custom Actions

- **Location**: `/components/layout/QuickLaunchBar.tsx`
- **Current**: Hardcoded quick actions
- **Required**:
  - User-configurable quick actions
  - Custom shortcuts/URLs
  - Button order preferences

### Quick Launch Database Table

```sql
quick_launch_items (
  id uuid primary key,
  user_id uuid references users(id),
  label text,
  action_type text,
  action_value text,
  icon text,
  color text,
  position integer,
  created_at timestamp
)
```

## User Preferences & Settings

### Dashboard Widgets

- **Required**:
  - Widget visibility
  - Widget positions
  - Widget sizes
  - Custom widget configurations

### Settings Database Tables

```sql
user_dashboard_widgets (
  id uuid primary key,
  user_id uuid references users(id),
  widget_type text,
  position_x integer,
  position_y integer,
  width integer,
  height integer,
  settings jsonb,
  created_at timestamp
)

user_preferences (
  id uuid primary key,
  user_id uuid references users(id),
  preference_key text,
  preference_value jsonb,
  updated_at timestamp
)
```

## Real-Time Features

### Supabase Realtime Subscriptions

- **Required**:
  - Incident updates (new messages, status changes)
  - Task board updates
  - Kanban board updates
  - Dashboard KPI updates
  - Notification system

## Row-Level Security (RLS)

### Required Policies

- Users can only see incidents assigned to them or their operator group
- Operators can only modify incidents in their groups
- Managers can see all data
- Knowledge base articles require published status for non-authors
- Personal data privacy controls

## Additional Features Needed

### Notifications

```sql
notifications (
  id uuid primary key,
  user_id uuid references users(id),
  title text,
  message text,
  type text,
  read boolean default false,
  link text,
  created_at timestamp
)
```

### Activity Feed

```sql
activity_feed (
  id uuid primary key,
  user_id uuid references users(id),
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamp
)
```

### Contracts & SLA

```sql
contracts (
  id uuid primary key,
  contract_number text unique,
  name text,
  supplier text,
  start_date date,
  end_date date,
  value decimal,
  status text,
  created_at timestamp
)
```

## Summary of Integration Points

Total files requiring Supabase integration: **15+ component files**
Total database tables needed: **40+ tables**
Total Supabase features needed:

- ✅ Authentication (Azure AD SSO)
- ✅ Database (PostgreSQL)
- ✅ Storage (File uploads)
- ✅ Realtime (Live updates)
- ✅ Row Level Security (Data access control)
- ✅ Edge Functions (Complex business logic)

## Next Steps

1. Set up Supabase project
2. Configure Azure AD authentication
3. Create database schema with all tables
4. Set up storage buckets
5. Implement RLS policies
6. Replace mock data with Supabase queries
7. Add real-time subscriptions
8. Implement file upload functionality
9. Add notification system
10. Test and deploy
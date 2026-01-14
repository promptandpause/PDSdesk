# PDSdesk - Supabase Setup Guide

### Process Delivery System - Enterprise Service Management by Prompt and Pause

This document outlines the Supabase setup required for the PDSdesk system.

## Database Schema

### Tables to Create

#### 1. users

```sql
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  initials text,
  role text not null, -- 'operator', 'coordinator', 'admin'
  department text,
  phone text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

#### 2. calls (incidents/tickets)

```sql
create table calls (
  id text primary key, -- Format: I 1604 024
  title text not null,
  description text,
  category text,
  subcategory text,
  call_type text, -- 'incident', 'service_request', 'complaint'
  priority integer default 3, -- 1=high, 2=medium, 3=low
  status text default 'new', -- 'new', 'in-progress', 'waiting', 'resolved', 'closed'
  caller_id uuid references users(id),
  operator_id uuid references users(id),
  operator_group text,
  target_date timestamp with time zone,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  sla_deadline timestamp with time zone,
  sla_status text, -- 'met', 'warning', 'breached'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

#### 3. call_activities

```sql
create table call_activities (
  id uuid primary key default uuid_generate_v4(),
  call_id text references calls(id) on delete cascade,
  activity_type text not null, -- 'note', 'status_change', 'assignment', 'request', 'memo'
  content text,
  created_by uuid references users(id),
  is_internal boolean default false,
  created_at timestamp with time zone default now()
);
```

#### 4. knowledge_articles

```sql
create table knowledge_articles (
  id text primary key, -- Format: KB-001
  title text not null,
  content text not null,
  excerpt text,
  category text,
  tags text[],
  status text default 'draft', -- 'draft', 'published', 'archived'
  author_id uuid references users(id),
  views integer default 0,
  helpful_count integer default 0,
  published_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

#### 5. assets

```sql
create table assets (
  id text primary key, -- Format: AST-1001
  name text not null,
  asset_type text not null, -- 'laptop', 'desktop', 'mobile', 'printer', 'server'
  serial_number text unique,
  model text,
  manufacturer text,
  status text default 'available', -- 'available', 'in-use', 'maintenance', 'retired'
  assignee_id uuid references users(id),
  location text,
  purchase_date date,
  warranty_expiry date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

#### 6. dashboards

```sql
create table dashboards (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  module text not null, -- 'call-management', 'asset-management', etc.
  is_default boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

#### 7. dashboard_widgets

```sql
create table dashboard_widgets (
  id uuid primary key default uuid_generate_v4(),
  dashboard_id uuid references dashboards(id) on delete cascade,
  widget_type text not null, -- 'kpi', 'report', 'selections', 'reports-list', 'new'
  title text,
  configuration jsonb, -- Widget-specific configuration
  position integer,
  created_at timestamp with time zone default now()
);
```

## Row Level Security (RLS)

Enable RLS on all tables and create policies:

```sql
-- Enable RLS
alter table users enable row level security;
alter table calls enable row level security;
alter table call_activities enable row level security;
alter table knowledge_articles enable row level security;
alter table assets enable row level security;

-- Example policies (adjust based on your needs)
-- Users can read their own data and other users in their organization
create policy "Users can view users"
  on users for select
  using (true);

-- Operators can view all calls
create policy "Operators can view calls"
  on calls for select
  using (true);

-- Operators can update calls assigned to them
create policy "Operators can update their calls"
  on calls for update
  using (operator_id = auth.uid());

-- Public knowledge base articles are viewable by all
create policy "Published articles are public"
  on knowledge_articles for select
  using (status = 'published');
```

## Microsoft SSO Setup

### 1. Azure AD Configuration

1. Go to Azure Portal > Azure Active Directory > App registrations
2. Create a new app registration for "Prompt & Pause Service Desk"
3. Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Note the Application (client) ID
5. Create a client secret and note it down
6. Go to API permissions and add:
   - Microsoft Graph > User.Read
   - Microsoft Graph > email
   - Microsoft Graph > profile

### 2. Supabase Configuration

1. Go to Supabase Dashboard > Authentication > Providers
2. Enable "Azure" provider
3. Enter your Azure AD credentials:
   - Azure Tenant ID
   - Azure Client ID
   - Azure Client Secret
4. Configure redirect URL

### 3. Application Code

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Sign in with Microsoft
async function signInWithMicrosoft() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      scopes: "email profile",
      redirectTo: window.location.origin,
    },
  });
}

// Get current user
const {
  data: { user },
} = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();
```

## Real-Time Subscriptions

Enable real-time updates for collaborative features:

```typescript
// Subscribe to new calls
const callsSubscription = supabase
  .channel("calls")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "calls" },
    (payload) => {
      console.log("New call:", payload.new);
      // Update UI with new call
    },
  )
  .subscribe();

// Subscribe to call updates
const callUpdatesSubscription = supabase
  .channel("call-updates")
  .on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "calls" },
    (payload) => {
      console.log("Call updated:", payload.new);
      // Update UI with changed call
    },
  )
  .subscribe();
```

## API Functions

Create Supabase Edge Functions for complex operations:

### 1. Calculate SLA Status

```typescript
// functions/calculate-sla/index.ts
import { createClient } from '@supabase/supabase-js'

export async function calculateSLA(callId: string) {
  const supabase = createClient(...)

  const { data: call } = await supabase
    .from('calls')
    .select('*')
    .eq('id', callId)
    .single()

  // Calculate SLA based on priority, business hours, etc.
  // Update call with SLA status
}
```

### 2. Auto-assign Calls

```typescript
// functions/auto-assign/index.ts
// Round-robin or load-based assignment logic
```

## Environment Variables

Add to your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Azure AD
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
```

## Migration Script

Run this to set up your database:

```sql
-- Run all CREATE TABLE statements above
-- Then create indexes for performance

create index idx_calls_status on calls(status);
create index idx_calls_operator on calls(operator_id);
create index idx_calls_caller on calls(caller_id);
create index idx_calls_created on calls(created_at);
create index idx_assets_assignee on assets(assignee_id);
create index idx_assets_status on assets(status);
create index idx_knowledge_status on knowledge_articles(status);
```

## Next Steps

1. Create Supabase project at https://supabase.com
2. Run the database schema scripts
3. Configure Microsoft Azure AD
4. Set up Supabase Auth with Azure provider
5. Update application code with Supabase client
6. Test authentication flow
7. Implement real-time features
8. Deploy to production

## Support

For questions about this setup, contact your Prompt & Pause administrator.
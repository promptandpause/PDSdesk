# Supabase Integration Guide - PDSdesk

## Overview

This document outlines the complete Supabase database schema, authentication setup, and integration points for PDSdesk.

---

## Table of Contents

1. [Authentication Setup](#authentication-setup)
2. [Database Schema](#database-schema)
3. [Real-Time Subscriptions](#real-time-subscriptions)
4. [Storage Buckets](#storage-buckets)
5. [Row Level Security (RLS)](#row-level-security)
6. [API Integration Points](#api-integration-points)
7. [Email Notifications System](#email-notifications-system)

---

## Authentication Setup

### Microsoft Azure AD Integration

```sql
-- Enable Azure AD authentication in Supabase Dashboard
-- Auth -> Providers -> Azure -> Enable

-- Configuration needed:
-- Azure Tenant ID: your-tenant-id
-- Client ID: your-client-id
-- Client Secret: your-client-secret
-- Callback URL: https://your-project.supabase.co/auth/v1/callback
```

### User Profile Sync

After Microsoft SSO login, sync user data:

```typescript
// On successful Azure AD login
const {
  data: { user },
} = await supabase.auth.getUser();

// Upsert user profile
await supabase.from("users").upsert({
  id: user.id,
  email: user.email,
  first_name: user.user_metadata.given_name,
  surname: user.user_metadata.family_name,
  department: user.user_metadata.department,
  job_title: user.user_metadata.job_title,
  role: "service-desk", // Default role, can be changed by admin
  avatar_url: user.user_metadata.picture,
  last_sign_in: new Date().toISOString(),
});
```

---

## Database Schema

### 1. Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  surname TEXT,
  display_name TEXT GENERATED ALWAYS AS (first_name || ' ' || surname) STORED,
  initials TEXT,

  -- Microsoft Azure AD synced fields
  azure_ad_id TEXT UNIQUE,
  department TEXT,
  job_title TEXT,
  business_phone TEXT,
  mobile_phone TEXT,
  office_location TEXT,

  -- PDSdesk specific fields
  role TEXT NOT NULL DEFAULT 'service-desk',
  -- Roles: 'admin', 'global-admin', 'service-desk', 'hr', 'devops', 'engineering', 'compliance', 'customer-support'

  operator_groups TEXT[], -- Array of operator group IDs
  avatar_url TEXT,
  online_status BOOLEAN DEFAULT FALSE,

  -- Preferences (JSON)
  preferences JSONB DEFAULT '{
    "theme": "light",
    "language": "en-GB",
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "24h",
    "emailNotifications": true,
    "browserNotifications": true,
    "showOnlineStatus": true,
    "sidebarOrder": [],
    "dashboardWidgets": []
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in TIMESTAMPTZ,

  CONSTRAINT valid_role CHECK (role IN ('admin', 'global-admin', 'service-desk', 'hr', 'devops', 'engineering', 'compliance', 'customer-support'))
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_azure_ad_id ON users(azure_ad_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. Operator Groups Table

```sql
CREATE TABLE operator_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  email TEXT NOT NULL UNIQUE, -- Group email for notifications (e.g., devops@promptandpause.com)

  -- Group configuration
  auto_assign_enabled BOOLEAN DEFAULT TRUE,
  round_robin_enabled BOOLEAN DEFAULT TRUE,
  email_notifications_enabled BOOLEAN DEFAULT TRUE,

  -- Members (array of user IDs)
  members UUID[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_operator_groups_name ON operator_groups(name);
CREATE INDEX idx_operator_groups_email ON operator_groups(email);

-- Seed data with team emails
INSERT INTO operator_groups (name, description, email) VALUES
  ('First Line Support', 'Handles initial incident triage and basic requests', 'servicedesk@promptandpause.com'),
  ('Second Line Support', 'Advanced technical support and escalations', 'support-l2@promptandpause.com'),
  ('Infra Team', 'Network infrastructure and connectivity', 'infrastructure@promptandpause.com'),
  ('Applications Team', 'Business applications and software', 'apps@promptandpause.com'),
  ('Customer Support', 'External customer inquiries', 'support@promptandpause.com'),
  ('DevOps Team', 'Development and operations', 'devops@promptandpause.com'),
  ('Security Team', 'Security and compliance', 'security@promptandpause.com'),
  ('HR Team', 'Human resources inquiries', 'hr@promptandpause.com');
```

---

### 3. Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL, -- 'assignment', 'escalation', 'update', 'sla', 'mention'
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,

  -- Related entity
  ticket_id UUID, -- References tickets(id) when implemented
  entity_type TEXT, -- 'ticket', 'change', 'problem', 'asset', etc.
  entity_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,

  CONSTRAINT valid_notification_type CHECK (type IN ('assignment', 'escalation', 'update', 'sla', 'mention', 'comment', 'status_change'))
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_ticket_id ON notifications(ticket_id);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

### 4. Tickets (Incidents) Table

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL, -- e.g., "I 2024 045"

  -- Ticket details
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  -- Status: 'open', 'in-progress', 'on-hold', 'resolved', 'closed', 'cancelled'

  priority TEXT NOT NULL DEFAULT 'p3',
  -- Priority: 'p1' (Critical), 'p2' (High), 'p3' (Medium), 'p4' (Low), 'p5' (Planning)

  category TEXT,
  subcategory TEXT,

  -- Assignment
  requester_id UUID REFERENCES users(id),
  operator_id UUID REFERENCES users(id),
  operator_group_id UUID REFERENCES operator_groups(id),

  -- SLA tracking
  sla_policy TEXT,
  sla_target_response TIMESTAMPTZ,
  sla_target_resolution TIMESTAMPTZ,
  sla_status TEXT DEFAULT 'within', -- 'within', 'warning', 'breached'
  response_time_minutes INTEGER,
  resolution_time_minutes INTEGER,

  -- AI auto-assignment
  ai_suggested_category TEXT,
  ai_suggested_group_id UUID REFERENCES operator_groups(id),
  ai_confidence DECIMAL(3,2), -- 0.00 to 1.00

  -- Cross-department workflow
  workflow_stage TEXT, -- e.g., 'hr-review', 'it-implementation'
  workflow_next_group_id UUID REFERENCES operator_groups(id),

  -- Impact & Urgency
  impact TEXT, -- 'low', 'medium', 'high', 'critical'
  urgency TEXT, -- 'low', 'medium', 'high', 'critical'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,

  -- Additional fields
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT valid_status CHECK (status IN ('open', 'in-progress', 'on-hold', 'resolved', 'closed', 'cancelled')),
  CONSTRAINT valid_priority CHECK (priority IN ('p1', 'p2', 'p3', 'p4', 'p5')),
  CONSTRAINT valid_sla_status CHECK (sla_status IN ('within', 'warning', 'breached'))
);

-- Indexes
CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_operator_id ON tickets(operator_id);
CREATE INDEX idx_tickets_operator_group_id ON tickets(operator_group_id);
CREATE INDEX idx_tickets_requester_id ON tickets(requester_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_sla_status ON tickets(sla_status);

-- Trigger for ticket number generation
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'I ' || TO_CHAR(EXTRACT(YEAR FROM NOW()), 'FM0000') || ' ' ||
                         LPAD((SELECT COUNT(*) + 1 FROM tickets WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()))::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_number_generation BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
```

---

### 5. Ticket Attachments Table

```sql
CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,

  -- File details
  file_name TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  file_type TEXT,
  storage_path TEXT NOT NULL, -- Path in Supabase storage

  -- Upload info
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
```

---

### 6. Ticket Comments (Worklog) Table

```sql
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,

  -- Comment details
  comment TEXT NOT NULL,
  comment_type TEXT DEFAULT 'internal', -- 'internal', 'public', 'resolution'

  -- Author
  author_id UUID NOT NULL REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Mentions
  mentioned_users UUID[], -- Array of user IDs mentioned in comment

  CONSTRAINT valid_comment_type CHECK (comment_type IN ('internal', 'public', 'resolution'))
);

-- Indexes
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_author_id ON ticket_comments(author_id);
CREATE INDEX idx_ticket_comments_created_at ON ticket_comments(created_at DESC);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_comments;
```

---

### 7. Bookmarks Table

```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Bookmark details
  entity_type TEXT NOT NULL, -- 'ticket', 'person', 'asset', 'knowledge', 'change', etc.
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  category TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, entity_type, entity_id)
);

-- Indexes
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_entity ON bookmarks(entity_type, entity_id);
```

---

### 8. Dashboard Widgets Table

```sql
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Widget details
  widget_type TEXT NOT NULL, -- 'my-tickets', 'sla-overview', 'recent-activity', etc.
  position INTEGER NOT NULL,
  size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large'

  -- Widget configuration
  config JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dashboard_widgets_user_id ON dashboard_widgets(user_id);
CREATE INDEX idx_dashboard_widgets_position ON dashboard_widgets(user_id, position);
```

---

### 9. SLA Policies Table

```sql
CREATE TABLE sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Time targets (in minutes)
  response_time_p1 INTEGER DEFAULT 15, -- 15 minutes for P1
  response_time_p2 INTEGER DEFAULT 60, -- 1 hour for P2
  response_time_p3 INTEGER DEFAULT 240, -- 4 hours for P3
  response_time_p4 INTEGER DEFAULT 480, -- 8 hours for P4
  response_time_p5 INTEGER DEFAULT 1440, -- 24 hours for P5

  resolution_time_p1 INTEGER DEFAULT 240, -- 4 hours for P1
  resolution_time_p2 INTEGER DEFAULT 480, -- 8 hours for P2
  resolution_time_p3 INTEGER DEFAULT 1440, -- 24 hours for P3
  resolution_time_p4 INTEGER DEFAULT 2880, -- 48 hours for P4
  resolution_time_p5 INTEGER DEFAULT 10080, -- 7 days for P5

  -- Business hours
  business_hours_start TIME DEFAULT '09:00',
  business_hours_end TIME DEFAULT '17:00',
  working_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- Mon-Fri (1=Monday, 7=Sunday)

  -- Active status
  active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SLA policy
INSERT INTO sla_policies (name, description, is_default) VALUES
  ('Standard SLA', 'Default SLA policy for all tickets', TRUE);
```

---

### 10. Knowledge Base Articles Table

```sql
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT UNIQUE NOT NULL, -- e.g., "KB-001"

  -- Article details
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],

  -- Visibility
  published BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'internal', -- 'internal', 'public'

  -- Statistics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  -- Author
  author_id UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_kb_articles_category ON kb_articles(category);
CREATE INDEX idx_kb_articles_published ON kb_articles(published);
CREATE INDEX idx_kb_articles_author_id ON kb_articles(author_id);

-- Full text search
CREATE INDEX idx_kb_articles_search ON kb_articles USING gin(to_tsvector('english', title || ' ' || content));
```

---

### 11. Assets Table

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT UNIQUE NOT NULL, -- e.g., "A-1001"

  -- Asset details
  name TEXT NOT NULL,
  category TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,

  -- Assignment
  assigned_to UUID REFERENCES users(id),
  location TEXT,
  department TEXT,

  -- Status
  status TEXT DEFAULT 'available', -- 'available', 'in-use', 'maintenance', 'retired'

  -- Purchase info
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  warranty_expiry DATE,
  supplier TEXT,

  -- Custom fields
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('available', 'in-use', 'maintenance', 'retired', 'disposed'))
);

-- Indexes
CREATE INDEX idx_assets_asset_id ON assets(asset_id);
CREATE INDEX idx_assets_assigned_to ON assets(assigned_to);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_status ON assets(status);
```

---

## Real-Time Subscriptions

### Notifications Real-Time

```typescript
// Subscribe to new notifications for current user
const notificationsChannel = supabase
  .channel("user-notifications")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${currentUser.id}`,
    },
    (payload) => {
      // Add new notification to state
      setNotifications((prev) => [
        payload.new as Notification,
        ...prev,
      ]);

      // Show browser notification if enabled
      if (Notification.permission === "granted") {
        new Notification("PDSdesk", {
          body: payload.new.message,
          icon: "/logo.png",
        });
      }
    },
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(notificationsChannel);
};
```

### Tickets Real-Time

```typescript
// Subscribe to ticket updates
const ticketsChannel = supabase
  .channel("tickets-updates")
  .on(
    "postgres_changes",
    {
      event: "*", // All events (INSERT, UPDATE, DELETE)
      schema: "public",
      table: "tickets",
      filter: `operator_id=eq.${currentUser.id}`, // Only tickets assigned to user
    },
    (payload) => {
      if (payload.eventType === "INSERT") {
        // New ticket assigned
      } else if (payload.eventType === "UPDATE") {
        // Ticket updated
      }
    },
  )
  .subscribe();
```

---

## Storage Buckets

### Create Buckets

```sql
-- Create storage buckets in Supabase Dashboard:
-- Storage -> Create Bucket

-- 1. ticket-attachments (Private)
-- 2. user-avatars (Public)
-- 3. kb-article-images (Public)
-- 4. supporting-files (Private)
```

### Upload Files

```typescript
// Upload ticket attachment
const uploadTicketAttachment = async (
  ticketId: string,
  file: File,
) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${ticketId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("ticket-attachments")
    .upload(fileName, file);

  if (error) throw error;

  // Save attachment record
  await supabase.from("ticket_attachments").insert({
    ticket_id: ticketId,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    storage_path: data.path,
    uploaded_by: currentUser.id,
  });

  return data;
};

// Get file URL
const getFileUrl = (
  path: string,
  bucket: string = "ticket-attachments",
) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};
```

---

## Row Level Security (RLS)

### Enable RLS on all tables

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_groups ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

```sql
-- Users: Can view all users, can only update own profile
CREATE POLICY "Users can view all users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Admins can update any user
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'global-admin')
  );

-- Notifications: Users can only see their own
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Tickets: Users can see tickets they're involved in
CREATE POLICY "Users can view assigned tickets" ON tickets
  FOR SELECT TO authenticated
  USING (
    operator_id = auth.uid() OR
    requester_id = auth.uid() OR
    operator_group_id IN (
      SELECT unnest(operator_groups) FROM users WHERE id = auth.uid()
    )
  );

-- Service desk and admins can see all tickets
CREATE POLICY "Service desk can view all tickets" ON tickets
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('service-desk', 'admin', 'global-admin')
  );

-- Bookmarks: Users can only see and manage their own
CREATE POLICY "Users can view own bookmarks" ON bookmarks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own bookmarks" ON bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own bookmarks" ON bookmarks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Operator Groups: All authenticated users can view
CREATE POLICY "Authenticated users can view operator groups" ON operator_groups
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can modify operator groups
CREATE POLICY "Admins can manage operator groups" ON operator_groups
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'global-admin')
  );
```

---

## API Integration Points

### 1. Authentication

```typescript
// Sign in with Microsoft Azure AD
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "azure",
  options: {
    scopes: "email openid profile",
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});

// Get current user
const {
  data: { user },
} = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();
```

### 2. Fetch Notifications

```typescript
const fetchNotifications = async () => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return data;
};
```

### 3. Create Ticket

```typescript
const createTicket = async (ticketData: Partial<Ticket>) => {
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      title: ticketData.title,
      description: ticketData.description,
      priority: ticketData.priority,
      category: ticketData.category,
      requester_id: currentUser.id,
      operator_group_id: ticketData.operator_group_id,
    })
    .select()
    .single();

  if (error) throw error;

  // Create notification for assigned operator/group
  if (data.operator_id) {
    await supabase.from("notifications").insert({
      user_id: data.operator_id,
      type: "assignment",
      message: `New ticket ${data.ticket_number} assigned to you`,
      ticket_id: data.id,
    });
  }

  return data;
};
```

### 4. Update User Preferences

```typescript
const updatePreferences = async (preferences: any) => {
  const { data, error } = await supabase
    .from("users")
    .update({ preferences })
    .eq("id", currentUser.id)
    .select()
    .single();

  return data;
};
```

### 5. Fetch Operator Groups

```typescript
const fetchOperatorGroups = async () => {
  const { data, error } = await supabase
    .from("operator_groups")
    .select("*")
    .order("name");

  return data;
};
```

### 6. AI Auto-Assignment

```typescript
const autoAssignTicket = async (
  ticketId: string,
  description: string,
) => {
  // Call OpenAI API (server-side)
  const response = await fetch("/api/ai-categorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });

  const { category, groupId, confidence } =
    await response.json();

  // Update ticket with AI suggestions
  await supabase
    .from("tickets")
    .update({
      ai_suggested_category: category,
      ai_suggested_group_id: groupId,
      ai_confidence: confidence,
      category: confidence > 0.8 ? category : null, // Auto-apply if high confidence
      operator_group_id: confidence > 0.8 ? groupId : null,
    })
    .eq("id", ticketId);
};
```

---

## Email Notifications System

### Overview

PDSdesk uses a comprehensive email notification system where each operator group has its own distribution email. All users within a group receive notifications via the group's email address.

### Email Configuration

#### System Emails

- **Internal Support:** `servicedesk@promptandpause.com`
- **No-Reply:** `noreply@promptandpause.com`

#### Operator Group Emails

Each operator group maintains its own email distribution list:

| Group               | Email                               | Purpose                     |
| ------------------- | ----------------------------------- | --------------------------- |
| First Line Support  | `servicedesk@promptandpause.com`    | Initial ticket triage       |
| Second Line Support | `support-l2@promptandpause.com`     | Advanced technical support  |
| Infra Team          | `infrastructure@promptandpause.com` | Network infrastructure      |
| Applications Team   | `apps@promptandpause.com`           | Business applications       |
| Customer Support    | `support@promptandpause.com`        | External customer inquiries |
| DevOps Team         | `devops@promptandpause.com`         | Development & operations    |
| Security Team       | `security@promptandpause.com`       | Security & compliance       |
| HR Team             | `hr@promptandpause.com`             | Human resources             |

### Email Triggers

#### 1. Ticket Assignment to Group

When a ticket is assigned to an operator group, all group members receive an email:

```typescript
const notifyGroupAssignment = async (
  ticketId: string,
  groupId: string,
) => {
  const { data: group } = await supabase
    .from("operator_groups")
    .select("email, name")
    .eq("id", groupId)
    .single();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  // Send email to group
  await sendEmail({
    to: group.email,
    subject: `New Ticket Assigned: ${ticket.ticket_number}`,
    template: "ticket-assigned-to-group",
    data: {
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      priority: ticket.priority,
      groupName: group.name,
      ticketUrl: `https://pdsdesk.com/tickets/${ticketId}`,
    },
  });
};
```

#### 2. Ticket Escalation

When a ticket is escalated:

```typescript
const notifyEscalation = async (
  ticketId: string,
  fromGroupId: string,
  toGroupId: string,
) => {
  const { data: toGroup } = await supabase
    .from("operator_groups")
    .select("email, name")
    .eq("id", toGroupId)
    .single();

  await sendEmail({
    to: toGroup.email,
    subject: `Ticket Escalated: ${ticket.ticket_number}`,
    template: "ticket-escalated",
    data: {
      ticketNumber: ticket.ticket_number,
      fromGroup: fromGroup.name,
      toGroup: toGroup.name,
      reason: escalationReason,
    },
  });
};
```

#### 3. SLA Warnings

When SLA is approaching or breached:

```typescript
const notifySLAWarning = async (ticketId: string) => {
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, operator_groups(email)")
    .eq("id", ticketId)
    .single();

  await sendEmail({
    to: ticket.operator_groups.email,
    subject: `SLA Warning: ${ticket.ticket_number}`,
    template: "sla-warning",
    priority: "high",
    data: {
      ticketNumber: ticket.ticket_number,
      slaStatus: ticket.sla_status,
      timeRemaining: calculateTimeRemaining(
        ticket.sla_target_resolution,
      ),
    },
  });
};
```

#### 4. Cross-Department Workflow

For multi-department tickets (e.g., HR → IT):

```typescript
const notifyWorkflowTransition = async (
  ticketId: string,
  nextGroupId: string,
) => {
  const { data: nextGroup } = await supabase
    .from("operator_groups")
    .select("email, name")
    .eq("id", nextGroupId)
    .single();

  await sendEmail({
    to: nextGroup.email,
    subject: `Workflow Action Required: ${ticket.ticket_number}`,
    template: "workflow-transition",
    data: {
      ticketNumber: ticket.ticket_number,
      currentStage: ticket.workflow_stage,
      nextStage: nextStage,
      actionRequired: actionDescription,
    },
  });
};
```

### Email Templates

#### Ticket Assignment Template

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .header { background: #4a9eff; color: white; padding: 20px; }
    .content { padding: 20px; }
    .button { background: #4a9eff; color: white; padding: 10px 20px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PDSdesk - New Ticket Assigned</h1>
  </div>
  <div class="content">
    <h2>{{ticketNumber}}: {{title}}</h2>
    <p><strong>Priority:</strong> {{priority}}</p>
    <p><strong>Assigned to:</strong> {{groupName}}</p>
    <p><strong>Description:</strong> {{description}}</p>
    <br>
    <a href="{{ticketUrl}}" class="button">View Ticket</a>
  </div>
</body>
</html>
```

### Email Service Integration

```typescript
// Using SendGrid, Resend, or similar
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({
  to,
  subject,
  template,
  data,
}: EmailParams) => {
  await resend.emails.send({
    from: "noreply@promptandpause.com",
    to,
    subject,
    html: renderTemplate(template, data),
  });
};
```

### Email Notification Preferences

Users can control email notifications via Settings:

```typescript
// User preferences stored in users table
{
  "emailNotifications": true,
  "notificationTypes": {
    "ticketAssigned": true,
    "ticketEscalated": true,
    "ticketUpdated": true,
    "slaWarnings": true,
    "mentions": true
  },
  "emailFrequency": "immediate" // or "digest-hourly", "digest-daily"
}
```

### Database Trigger for Email Notifications

```sql
-- Trigger to send email when ticket is assigned to group
CREATE OR REPLACE FUNCTION notify_group_on_ticket_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue email notification (use pg_notify or insert into queue table)
  PERFORM pg_notify(
    'ticket_assigned',
    json_build_object(
      'ticket_id', NEW.id,
      'group_id', NEW.operator_group_id,
      'ticket_number', NEW.ticket_number
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_group_assignment_notification
AFTER INSERT OR UPDATE OF operator_group_id ON tickets
FOR EACH ROW
WHEN (NEW.operator_group_id IS NOT NULL)
EXECUTE FUNCTION notify_group_on_ticket_assignment();
```

### Email Queue Table (Optional)

For better reliability, use an email queue:

```sql
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  template_data JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Index for processing
CREATE INDEX idx_email_queue_status ON email_queue(status, created_at);
```

### Processing Email Queue

```typescript
// Background job to process email queue
const processEmailQueue = async () => {
  const { data: emails } = await supabase
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .limit(100);

  for (const email of emails) {
    try {
      await sendEmail({
        to: email.to_email,
        subject: email.subject,
        template: email.template,
        data: email.template_data,
      });

      await supabase
        .from("email_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", email.id);
    } catch (error) {
      await supabase
        .from("email_queue")
        .update({
          status: "failed",
          attempts: email.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq("id", email.id);
    }
  }
};

// Run every minute
setInterval(processEmailQueue, 60000);
```

---

## Environment Variables

```env
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Server-side only (for AI features)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
RESEND_API_KEY=your-resend-api-key
```

---

## Initialization Code

```typescript
// /lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
);

// Type definitions
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Ticket =
  Database["public"]["Tables"]["tickets"]["Row"];
export type Notification =
  Database["public"]["Tables"]["notifications"]["Row"];
// ... etc
```

---

## Summary

This Supabase integration provides:

✅ **Authentication:** Microsoft Azure AD SSO
✅ **Real-time Updates:** Notifications, tickets, comments
✅ **File Storage:** Attachments, avatars, documents
✅ **Security:** Row Level Security policies
✅ **Scalability:** Indexed queries, efficient data structure
✅ **AI Integration:** Auto-categorization and assignment
✅ **User Preferences:** Customizable dashboards and settings

**Next Steps:**

1. Create Supabase project
2. Run all SQL migrations
3. Configure Azure AD provider
4. Create storage buckets
5. Deploy and test

---

**Last Updated:** 2024-01-11
**Version:** 1.0
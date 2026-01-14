# Microsoft User Sync & Storage Integration

## Overview

This document outlines the Microsoft Azure AD user synchronization and file storage setup for PDSdesk.

---

## 1. Microsoft Azure AD User Sync

### **Purpose**

When new employees are added to Microsoft Azure AD (or existing employees log in), their user information automatically syncs to PDSdesk, making it easier for:

- Operators to assign tickets (auto-populated user list)
- Users to raise tickets (their details are pre-filled)
- Admins to manage user access and permissions

### **How It Works**

#### **A. Initial Login Flow**

1. User clicks "Sign in with Microsoft"
2. Azure AD authenticates the user
3. Supabase receives user profile from Microsoft Graph API
4. **Automatic Sync Trigger** runs
5. User data is stored/updated in PDSdesk database

#### **B. Data Synced from Microsoft**

```typescript
// Microsoft Graph API User Object
{
  id: "azure-ad-user-id",
  userPrincipalName: "alex.johnson@promptandpause.com",
  displayName: "Alex Johnson",
  givenName: "Alex",
  surname: "Johnson",
  jobTitle: "IT Support Engineer",
  department: "IT Services",
  officeLocation: "London Office - Floor 3",
  mobilePhone: "+44 7700 900000",
  businessPhones: ["+44 (0)20 1234 5678"],
  mail: "alex.johnson@promptandpause.com",
  employeeId: "EMP001234",
  manager: {
    displayName: "Sarah Williams",
    mail: "sarah.williams@promptandpause.com"
  }
}
```

### **C. Supabase Database Schema**

```sql
-- Main users table (synced from Microsoft)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_ad_id text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  first_name text,
  surname text,
  display_name text,
  job_title text,
  department text,
  office_location text,
  mobile_phone text,
  business_phone text,
  employee_id text,
  manager_id uuid REFERENCES users(id),
  is_active boolean DEFAULT true,
  role text DEFAULT 'user', -- 'user', 'operator', 'manager', 'admin'
  avatar_url text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  last_login timestamp,
  -- Additional PDSdesk-specific fields
  operator_group_id uuid REFERENCES operator_groups(id),
  can_raise_tickets boolean DEFAULT true,
  can_view_all_tickets boolean DEFAULT false,
  notification_preferences jsonb DEFAULT '{}'::jsonb
);

-- Sync tracking table
CREATE TABLE user_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  sync_source text, -- 'microsoft_sso', 'manual', 'scheduled'
  sync_status text, -- 'success', 'failed', 'partial'
  changes_detected jsonb,
  error_message text,
  synced_at timestamp DEFAULT now()
);

-- Operator groups (for ticket assignment)
CREATE TABLE operator_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);
```

### **D. Supabase Edge Function for Sync**

Create an Edge Function: `/supabase/functions/sync-microsoft-user/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get user data from Microsoft Graph API token
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    // Fetch user from Microsoft Graph
    const graphResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    const msUser = await graphResponse.json();

    // Fetch manager details if available
    let managerId = null;
    if (msUser.manager) {
      const managerResponse = await fetch(
        `https://graph.microsoft.com/v1.0/users/${msUser.manager.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const managerData = await managerResponse.json();

      // Find or create manager in database
      const { data: manager } = await supabase
        .from("users")
        .select("id")
        .eq("email", managerData.mail)
        .single();

      managerId = manager?.id;
    }

    // Upsert user data
    const { data: user, error } = await supabase
      .from("users")
      .upsert(
        {
          azure_ad_id: msUser.id,
          email: msUser.mail || msUser.userPrincipalName,
          first_name: msUser.givenName,
          surname: msUser.surname,
          display_name: msUser.displayName,
          job_title: msUser.jobTitle,
          department: msUser.department,
          office_location: msUser.officeLocation,
          mobile_phone: msUser.mobilePhone,
          business_phone: msUser.businessPhones?.[0],
          employee_id: msUser.employeeId,
          manager_id: managerId,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "azure_ad_id",
          returning: "representation",
        },
      );

    if (error) throw error;

    // Log sync activity
    await supabase.from("user_sync_log").insert({
      user_id: user.id,
      sync_source: "microsoft_sso",
      sync_status: "success",
      changes_detected: { new_login: true },
    });

    return new Response(
      JSON.stringify({ success: true, user }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
```

### **E. Frontend Implementation**

```typescript
// /lib/auth.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function signInWithMicrosoft() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      scopes: "email profile openid User.Read",
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

// After successful auth, trigger user sync
export async function syncUserFromMicrosoft() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.provider_token) {
    // Call Edge Function to sync user data
    const response = await fetch(
      "/functions/v1/sync-microsoft-user",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return await response.json();
  }
}
```

---

## 2. Storage Buckets Configuration

### **A. Ticket Attachments**

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false);

-- Set up storage policies
CREATE POLICY "Users can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM incidents
    WHERE caller_id = auth.uid()
    OR operator_id = auth.uid()
  )
);

CREATE POLICY "Users can view ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM incidents
    WHERE caller_id = auth.uid()
    OR operator_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM incidents
    WHERE caller_id = auth.uid()
  )
);
```

### **B. User Avatars**

```sql
-- Create storage bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Storage policies
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### **C. Knowledge Base Attachments**

```sql
-- Create storage bucket for KB articles
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false);

-- Storage policies
CREATE POLICY "Operators can upload KB attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-base'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('operator', 'admin')
  )
);

CREATE POLICY "All users can view KB attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge-base');
```

### **D. File Upload Implementation**

```typescript
// /lib/storage.ts
import { supabase } from "./supabase";

export async function uploadTicketAttachment(
  ticketId: string,
  file: File,
) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${ticketId}/${fileName}`;

  // Upload file
  const { data, error } = await supabase.storage
    .from("ticket-attachments")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  // Save attachment record
  const { data: attachment, error: dbError } = await supabase
    .from("incident_attachments")
    .insert({
      incident_id: ticketId,
      file_name: file.name,
      file_path: data.path,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: (await supabase.auth.getUser()).data.user
        ?.id,
    })
    .select()
    .single();

  if (dbError) throw dbError;

  return attachment;
}

export async function getTicketAttachments(ticketId: string) {
  const { data, error } = await supabase
    .from("incident_attachments")
    .select("*")
    .eq("incident_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Generate signed URLs for download
  const attachmentsWithUrls = await Promise.all(
    data.map(async (attachment) => {
      const { data: urlData } = await supabase.storage
        .from("ticket-attachments")
        .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry

      return {
        ...attachment,
        url: urlData?.signedUrl,
      };
    }),
  );

  return attachmentsWithUrls;
}

export async function deleteTicketAttachment(
  attachmentId: string,
) {
  // Get attachment details
  const { data: attachment } = await supabase
    .from("incident_attachments")
    .select("file_path")
    .eq("id", attachmentId)
    .single();

  if (!attachment) throw new Error("Attachment not found");

  // Delete from storage
  await supabase.storage
    .from("ticket-attachments")
    .remove([attachment.file_path]);

  // Delete from database
  const { error } = await supabase
    .from("incident_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) throw error;
}
```

### **E. Attachment Database Table**

```sql
CREATE TABLE incident_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_attachments_incident ON incident_attachments(incident_id);
CREATE INDEX idx_attachments_uploader ON incident_attachments(uploaded_by);
```

---

## 3. Benefits of User Sync

### **For Operators:**

✅ Automatically populated user directory
✅ Easy ticket assignment with searchable user list
✅ Manager hierarchy for escalations
✅ Department-based routing

### **For End Users:**

✅ One-click sign-in with Microsoft account
✅ Profile auto-populated (no manual entry)
✅ Easier ticket submission (details pre-filled)
✅ Direct manager escalation path

### **For Administrators:**

✅ Centralized user management via Azure AD
✅ Automatic sync when users join/leave
✅ Department and team structure mirrored
✅ Audit trail of user changes

---

## 4. Implementation Checklist

### **Phase 1: Setup (Week 1)**

- [ ] Configure Azure AD app registration
- [ ] Add Supabase redirect URLs to Azure
- [ ] Set up Supabase Auth with Azure provider
- [ ] Create storage buckets
- [ ] Set up storage policies

### **Phase 2: User Sync (Week 2)**

- [ ] Create `users` table with Microsoft fields
- [ ] Create Edge Function for user sync
- [ ] Test Microsoft SSO login
- [ ] Implement automatic sync on login
- [ ] Add sync logging

### **Phase 3: Storage Integration (Week 3)**

- [ ] Update TicketDetailView with upload functionality
- [ ] Implement file upload functions
- [ ] Create attachment database table
- [ ] Test file upload/download/delete
- [ ] Add file type validation

### **Phase 4: Testing (Week 4)**

- [ ] Test user sync with multiple Microsoft accounts
- [ ] Test file uploads with various file types
- [ ] Test storage permissions
- [ ] Test manager hierarchy sync
- [ ] Load testing with multiple concurrent uploads

---

## 5. Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Azure AD
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-tenant-id

# Microsoft Graph API
GRAPH_API_ENDPOINT=https://graph.microsoft.com/v1.0
```

---

## 6. Scheduled Sync (Optional)

For bulk user synchronization (e.g., nightly sync of all users):

```sql
-- Create cron job in Supabase
SELECT cron.schedule(
  'sync-all-microsoft-users',
  '0 2 * * *', -- Run at 2 AM daily
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/bulk-sync-users',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  );
  $$
);
```

---

This completes the Microsoft User Sync and Storage integration plan! 🚀
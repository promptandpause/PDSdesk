# Global Admin Access Guide - PDSdesk

## Overview

Global Administrators in PDSdesk have unrestricted access to ALL modules, settings, and functions across the entire system.

---

## Admin Role Identification

### **Role Names**

The system recognizes two role values as global admin:

- `admin`
- `global-admin`

### **How It Works**

```typescript
// In App.tsx - mock user object
const user = {
  id: "1",
  name: "Alex Johnson",
  email: "alex.johnson@promptandpause.com",
  role: "admin", // or 'global-admin'
  initials: "AJ",
};

// When connected to Supabase:
// Role comes from users.role column
```

---

## What Admins Can See & Do

### **1. Sidebar Access (ALL Modules)**

Admins bypass all role-based restrictions and see:

#### **Quick Access**

- ✅ Home (Dashboard)
- ✅ Search
- ✅ Tickets Assigned to Me

#### **Service Desk** (Full Access)

- ✅ Service Desk KPIs
- ✅ Incident Queue
- ✅ Call Management
- ✅ Problem Management
- ✅ Change Management
- ✅ Project Management
- ✅ Knowledge Base
- ✅ Operations Management
- ✅ Reservations Management
- ✅ Item Management
- ✅ Asset Management
- ✅ Contract Management and SLM

#### **Customer Support** (Full Access)

- ✅ Customer Support Queue (email integration)

#### **Tools** (Full Access)

- ✅ Task Board
- ✅ Kanban Board
- ✅ Plan Board

#### **System**

- ✅ Settings (with exclusive admin sections)
- ✅ Help

**Total:** Admins see all 19 modules + Settings + Help

---

### **2. Settings Page (Enhanced for Admins)**

#### **Standard User Sections (Everyone Has These)**

1. **Profile** - Personal information (synced from Microsoft)
2. **Notifications** - Email, browser, and notification preferences
3. **Display & Language** - Theme, language, date/time formats
4. **Privacy & Security** - Online status, direct messages, session management

#### **ADMIN-ONLY Sections (Only Admins See These)**

##### **5. System Settings** 🔒

**Purpose:** Configure system-wide settings

**Features:**

- **Microsoft Azure AD Integration**
  - Azure Tenant ID
  - Client ID
  - Client Secret
  - Test Connection button
- **Email Integration**
  - Support email address
  - No-reply email address
- **Business Hours Configuration**
  - Start time (default: 09:00)
  - End time (default: 17:00)
  - Working days selector (Mon-Fri highlighted)

**Visual Identifier:** Orange banner at top:

```
⚠️ Global Admin Settings
These settings affect the entire PDSdesk system. Changes will apply to all users.
```

##### **6. User Management** 🔒

**Purpose:** Manage all system users and their roles

**Features:**

- **User Directory Table**
  - Name, Email, Department, Role, Status, Actions
  - Shows all 142 users (example count)
  - Edit any user's role
  - View user status (Active/Inactive)
- **Sync from Azure AD Button**
  - Manually trigger user sync from Microsoft
  - Updates all user information
  - Creates new users who logged in

- **Role Assignment Dropdown**
  - Admin
  - Service Desk
  - DevOps
  - Engineering
  - Customer Support
  - HR Team
  - Compliance

**Sample Users Displayed:**

- Alex Johnson (alex.johnson@promptandpause.com) - Service Desk
- Sarah Williams (sarah.williams@promptandpause.com) - HR Team
- Michael Brown (michael.brown@promptandpause.com) - Admin

##### **7. AI & Automation** 🔒

**Purpose:** Configure AI-powered features

**Features:**

- **AI Auto-Assignment**
  - Toggle on/off
  - OpenAI API Key input (masked)
  - Model selector:
    - gpt-4o-mini (default, cost-effective)
    - gpt-4o (most capable)
    - gpt-4-turbo (balanced)
- **Auto-Assign to Available Agents**
  - Toggle on/off
  - Uses round-robin algorithm
  - Balances workload across team members
- **Cross-Department Workflows**
  - Toggle on/off
  - Enables multi-step tickets (e.g., HR → IT for name changes)

---

## Comparison: Admin vs Regular User

| Feature                 | Regular User         | Global Admin                          |
| ----------------------- | -------------------- | ------------------------------------- |
| **Sidebar Modules**     | Role-based (limited) | ALL modules visible                   |
| **Settings Sections**   | 4 sections           | 7 sections (4 standard + 3 admin)     |
| **User Management**     | Own profile only     | All users, role changes               |
| **System Config**       | None                 | Azure AD, email, business hours       |
| **AI Settings**         | None                 | Full control over AI features         |
| **Queues Visible**      | Department-specific  | ALL queues (IT, HR, Customer Support) |
| **Access Restrictions** | Yes                  | None                                  |

---

## Visual Indicators for Admins

### **Settings Page Orange Banner**

When an admin navigates to System Settings, User Management, or AI Settings:

```
╔═══════════════════════════════════════════════════════════╗
║ 🛡️ Global Admin Settings                                 ║
║ These settings affect the entire PDSdesk system.          ║
║ Changes will apply to all users.                          ║
╚═══════════════════════════════════════════════════════════╝
```

### **Sidebar (No Visual Difference)**

- Admins see the same sidebar design
- No special badge or indicator
- Just see ALL items (while others see filtered list)

---

## Use Cases

### **Use Case 1: Changing a User's Role**

**Scenario:** Employee Sarah Williams moves from HR to Service Desk team

1. Admin opens Settings
2. Clicks "User Management" (admin-only section)
3. Finds Sarah Williams in the table
4. Changes role dropdown from "HR Team" to "Service Desk"
5. Clicks Save
6. Sarah now sees Service Desk modules on her next login

### **Use Case 2: Configuring AI Auto-Assignment**

**Scenario:** Enable AI ticket routing for the first time

1. Admin opens Settings
2. Clicks "AI & Automation" (admin-only section)
3. Toggles "AI Auto-Assignment" ON
4. Enters OpenAI API Key: `sk-...`
5. Selects model: `gpt-4o-mini`
6. Toggles "Auto-Assign to Available Agents" ON
7. Toggles "Cross-Department Workflows" ON
8. Clicks Save
9. All new tickets now use AI categorization and auto-routing

### **Use Case 3: Updating Business Hours**

**Scenario:** Company changes to 8AM-6PM Monday-Friday

1. Admin opens Settings
2. Clicks "System Settings" (admin-only section)
3. Changes Start Time to 08:00
4. Changes End Time to 18:00
5. Ensures Mon-Fri are selected
6. Clicks Save
7. SLA calculations now use new business hours

### **Use Case 4: Syncing New Employees from Azure AD**

**Scenario:** 10 new employees joined and logged in with Microsoft

1. Admin opens Settings
2. Clicks "User Management"
3. Clicks "Sync from Azure AD" button
4. System fetches latest user data from Microsoft Graph API
5. New users appear in the table
6. Admin assigns appropriate roles to each
7. New users see their role-specific modules

---

## Security Considerations

### **⚠️ Important Notes**

1. **Admin Access is Powerful**
   - Admins can change anyone's role (including removing other admins)
   - Admins can view all tickets, even sensitive ones
   - Admins can modify system-wide settings affecting all users

2. **Recommended Admin Practices**
   - Keep admin accounts to minimum (2-3 max)
   - Use dedicated admin accounts (not daily-use accounts)
   - Log all admin actions (future feature: audit trail)
   - Regular review of admin access

3. **Role Hierarchy** (Recommended)

   ```
   Global Admin (highest)
     ↓
   Service Desk Manager
     ↓
   Service Desk Team Lead
     ↓
   Service Desk Operator
     ↓
   Department Operators (DevOps, Engineering, etc.)
     ↓
   End Users (lowest)
   ```

4. **What Admins CANNOT Do** (Future Enhancements)
   - Delete the system (safety lock needed)
   - Remove their own admin role (needs 2nd admin approval)
   - Access deleted/archived data (compliance)

---

## Supabase Integration

### **Role Storage**

```sql
-- In users table
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  role text NOT NULL, -- 'admin', 'service-desk', 'hr', etc.
  -- ... other fields
);
```

### **Admin Check (Frontend)**

```typescript
// /lib/auth.ts
export function isGlobalAdmin(user: User): boolean {
  return user.role === "admin" || user.role === "global-admin";
}

// Usage in components
if (isGlobalAdmin(currentUser)) {
  // Show admin-only features
}
```

### **Admin Check (Backend - Row Level Security)**

```sql
-- Example RLS policy for admin-only data
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'global-admin')
);
```

---

## Testing Admin Access

### **Test Checklist**

- [ ] **Sidebar Visibility**
  - [ ] Admin sees all 19+ modules
  - [ ] Non-admin sees only role-specific modules
  - [ ] Customer Support Queue only visible to admins & customer-support role

- [ ] **Settings Page**
  - [ ] Admin sees 7 sections (4 standard + 3 admin)
  - [ ] Non-admin sees only 4 standard sections
  - [ ] Orange admin banner appears on admin sections

- [ ] **System Settings**
  - [ ] Azure AD fields editable
  - [ ] Email fields editable
  - [ ] Business hours adjustable
  - [ ] Test Connection button clickable

- [ ] **User Management**
  - [ ] User table displays all users
  - [ ] Role dropdowns functional
  - [ ] Sync from Azure AD button works
  - [ ] Edit links functional

- [ ] **AI & Automation**
  - [ ] All toggle switches work
  - [ ] OpenAI API key input masked
  - [ ] Model selector functional

---

## Future Enhancements

### **Planned Admin Features**

1. **Audit Trail** - Log all admin actions
2. **Bulk User Operations** - Import/export users CSV
3. **Advanced Permissions** - Granular access control
4. **System Health Dashboard** - Monitor PDSdesk performance
5. **Backup & Restore** - System-wide data management
6. **Custom Role Creation** - Define new roles beyond defaults
7. **Department Management** - Create/edit departments
8. **SLA Policy Editor** - Visual SLA policy builder
9. **Email Template Editor** - Customize notification emails
10. **Branding Settings** - Logo, colors, company name

---

## Summary

✅ **Global Admins have complete system access**
✅ **Role check: `admin` or `global-admin`**
✅ **See ALL sidebar modules (no restrictions)**
✅ **Get 3 exclusive settings sections:**

- System Settings (Azure AD, email, business hours)
- User Management (view/edit all users)
- AI & Automation (configure AI features)
  ✅ **Orange admin banner on admin-only pages**
  ✅ **No visual difference in sidebar (just see more items)**

**Admin access is now fully implemented and ready for Supabase integration!** 🚀
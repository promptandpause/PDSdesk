# AI-Powered Auto-Assignment & SLA Management System

## Overview

PDSdesk uses AI to automatically categorize incoming tickets, assign them to the correct department/team, and set appropriate SLA timers based on priority and category.

---

## 1. AI Auto-Assignment System

### **Purpose**

Eliminate manual ticket triaging by using AI to:

- Automatically categorize tickets
- Route to the correct department
- Assign to available team members
- Set priority levels
- Calculate SLA timers

### **How It Works**

```
Ticket Created
    ↓
AI Analyzes Content (subject + description)
    ↓
Determines Category & Department
    ↓
Sets Priority (P1-P5)
    ↓
Calculates SLA Times
    ↓
Routes to Correct Queue
    ↓
Auto-assigns to Available Agent (if enabled)
    ↓
Sends Notifications
```

### **AI Analysis Engine**

```typescript
// /lib/ai-assignment.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeAndAssignTicket(
  subject: string,
  description: string,
  callerDepartment?: string,
) {
  const prompt = `
You are an IT service desk AI assistant. Analyze the following ticket and provide categorization:

Subject: ${subject}
Description: ${description}
Caller Department: ${callerDepartment || "Unknown"}

Provide a JSON response with:
{
  "category": "string", // e.g., "Hardware", "Software", "Network", "Access Request", "HR Request"
  "subcategory": "string", // e.g., "Laptop", "Microsoft Office", "WiFi", "Account Creation"
  "priority": "P1" | "P2" | "P3" | "P4" | "P5",
  "department": "string", // "IT Support", "Network Team", "Applications Team", "HR", "Facilities"
  "keywords": ["string"], // Extract 3-5 key terms
  "requiredAction": "string", // Brief description of what needs to be done
  "estimatedComplexity": "Low" | "Medium" | "High",
  "reasoning": "string" // Why you made these decisions
}

Priority Guidelines:
- P1 (Critical): Complete system outage, multiple users affected, business-critical
- P2 (High): Single user unable to work, significant impact
- P3 (Medium): User can work with workaround, moderate impact
- P4 (Low): Minor inconvenience, cosmetic issues
- P5 (Planning): Requests for future changes, no immediate impact

Department Routing:
- "Hardware", "Network", "Phone", "Printer" → IT Support / Network Team
- "Software", "Application", "Email", "Microsoft" → IT Support / Applications Team
- "Access Request", "Account", "Password" → IT Support (First Line)
- "Name Change", "Employee Record", "Onboarding" → HR (then to IT)
- "Contract", "Compliance", "Audit" → Compliance Team
- "Customer Inquiry", "Sales", "Product Question" → Customer Support
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const analysis = JSON.parse(
    response.choices[0].message.content!,
  );
  return analysis;
}
```

### **Workflow Examples**

#### **Example 1: HR → IT Handoff**

**Ticket:** "Employee name change from Jane Smith to Jane Williams"

```json
{
  "category": "HR Request",
  "subcategory": "Name Change",
  "priority": "P4",
  "department": "HR",
  "keywords": ["name change", "employee record", "Jane Smith", "Jane Williams"],
  "requiredAction": "Update employee name in HR system, then route to IT for email/account updates",
  "estimatedComplexity": "Low",
  "reasoning": "Name changes require HR to update official records first, then IT to update system accounts"
}
```

**Workflow:**

1. AI assigns to **HR Department**
2. HR updates employee database
3. HR marks task complete and **escalates to IT Support**
4. IT updates:
   - Email address (if needed)
   - Active Directory account
   - System access
   - Email signature
5. IT marks complete and closes ticket

#### **Example 2: Network Issue**

**Ticket:** "Cannot connect to WiFi in Building A, Floor 3"

```json
{
  "category": "Network",
  "subcategory": "WiFi",
  "priority": "P2",
  "department": "Network Team",
  "keywords": ["wifi", "connectivity", "Building A", "Floor 3"],
  "requiredAction": "Check WiFi access point in specified location, verify signal strength and connectivity",
  "estimatedComplexity": "Medium",
  "reasoning": "WiFi issues affecting entire floor could impact multiple users, requires network team investigation"
}
```

**Workflow:**

1. AI assigns to **Network Team queue**
2. Auto-assigns to available Network Engineer
3. SLA timer starts (P2 = 4 hours response, 8 hours resolution)
4. Engineer investigates and resolves

#### **Example 3: IT Support (Auto-Queue)**

**Ticket:** "Microsoft Excel keeps crashing when opening large files"

```json
{
  "category": "Software",
  "subcategory": "Microsoft Office",
  "priority": "P3",
  "department": "IT Support",
  "keywords": ["Excel", "crashing", "large files", "Microsoft Office"],
  "requiredAction": "Troubleshoot Excel application, check for updates, verify file size limits, may need to repair Office installation",
  "estimatedComplexity": "Medium",
  "reasoning": "Application issue affecting single user, workaround exists (use smaller files or desktop version)"
}
```

**Workflow:**

1. AI assigns to **IT Support (First Line) queue**
2. Available agent picks up ticket
3. Agent troubleshoots:
   - Check Excel version
   - Clear cache
   - Repair Office
4. If complex, **escalate to Applications Team**

---

## 2. SLA (Service Level Agreement) Management

### **SLA Tiers by Priority**

| Priority          | Response Time  | Resolution Time  | Escalation    | Business Hours |
| ----------------- | -------------- | ---------------- | ------------- | -------------- |
| **P1** (Critical) | 15 minutes     | 4 hours          | After 2 hours | 24/7           |
| **P2** (High)     | 1 hour         | 8 hours          | After 6 hours | Business hours |
| **P3** (Medium)   | 4 hours        | 3 business days  | After 2 days  | Business hours |
| **P4** (Low)      | 8 hours        | 5 business days  | After 4 days  | Business hours |
| **P5** (Planning) | 1 business day | 10 business days | N/A           | Business hours |

### **Database Schema**

```sql
-- SLA Definitions
CREATE TABLE sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  priority text NOT NULL, -- P1, P2, P3, P4, P5
  category text, -- Optional category-specific SLA
  response_time_minutes integer NOT NULL,
  resolution_time_minutes integer NOT NULL,
  escalation_time_minutes integer,
  business_hours_only boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- SLA Tracking per Ticket
CREATE TABLE sla_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  sla_policy_id uuid REFERENCES sla_policies(id),

  -- Response SLA
  response_due_at timestamp NOT NULL,
  first_response_at timestamp,
  response_sla_met boolean,
  response_breached boolean DEFAULT false,

  -- Resolution SLA
  resolution_due_at timestamp NOT NULL,
  resolved_at timestamp,
  resolution_sla_met boolean,
  resolution_breached boolean DEFAULT false,

  -- Escalation
  escalation_due_at timestamp,
  escalated_at timestamp,

  -- Pause/Resume (for on-hold tickets)
  paused_at timestamp,
  pause_duration_minutes integer DEFAULT 0,

  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- SLA Breach Log
CREATE TABLE sla_breach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incidents(id),
  breach_type text, -- 'response' or 'resolution'
  breach_time timestamp NOT NULL,
  notified_at timestamp,
  manager_notified boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);
```

### **SLA Calculation Function**

```typescript
// /lib/sla-calculator.ts
export function calculateSLADeadlines(
  createdAt: Date,
  priority: "P1" | "P2" | "P3" | "P4" | "P5",
  category?: string,
) {
  const slaConfig = {
    P1: {
      response: 15,
      resolution: 240,
      escalation: 120,
      businessHours: false,
    },
    P2: {
      response: 60,
      resolution: 480,
      escalation: 360,
      businessHours: true,
    },
    P3: {
      response: 240,
      resolution: 4320,
      escalation: 2880,
      businessHours: true,
    },
    P4: {
      response: 480,
      resolution: 7200,
      escalation: 5760,
      businessHours: true,
    },
    P5: {
      response: 1440,
      resolution: 14400,
      escalation: null,
      businessHours: true,
    },
  };

  const config = slaConfig[priority];

  // Calculate deadlines
  const responseDue = addMinutes(
    createdAt,
    config.response,
    config.businessHours,
  );
  const resolutionDue = addMinutes(
    createdAt,
    config.resolution,
    config.businessHours,
  );
  const escalationDue = config.escalation
    ? addMinutes(
        createdAt,
        config.escalation,
        config.businessHours,
      )
    : null;

  return {
    responseDue,
    resolutionDue,
    escalationDue,
  };
}

function addMinutes(
  startDate: Date,
  minutes: number,
  businessHoursOnly: boolean,
): Date {
  if (!businessHoursOnly) {
    // 24/7 calculation
    return new Date(startDate.getTime() + minutes * 60000);
  }

  // Business hours: Mon-Fri 9AM-5PM
  let date = new Date(startDate);
  let remainingMinutes = minutes;

  while (remainingMinutes > 0) {
    // Skip weekends
    if (date.getDay() === 0) date.setDate(date.getDate() + 1); // Sunday → Monday
    if (date.getDay() === 6) date.setDate(date.getDate() + 2); // Saturday → Monday

    const hour = date.getHours();

    // If before business hours, jump to 9 AM
    if (hour < 9) {
      date.setHours(9, 0, 0, 0);
    }

    // If after business hours, jump to next day 9 AM
    if (hour >= 17) {
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
      continue;
    }

    // Calculate minutes until end of business day
    const endOfDay = new Date(date);
    endOfDay.setHours(17, 0, 0, 0);
    const minutesUntilEOD =
      (endOfDay.getTime() - date.getTime()) / 60000;

    if (remainingMinutes <= minutesUntilEOD) {
      // Fits within today
      date = new Date(
        date.getTime() + remainingMinutes * 60000,
      );
      remainingMinutes = 0;
    } else {
      // Spills to next day
      remainingMinutes -= minutesUntilEOD;
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
    }
  }

  return date;
}
```

### **SLA Countdown Display**

```typescript
// In ticket view component
export function SLACountdown({ slaTracking }: { slaTracking: SLATracking }) {
  const now = new Date();
  const resolutionDue = new Date(slaTracking.resolution_due_at);
  const timeRemaining = resolutionDue.getTime() - now.getTime();

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  const isBreached = timeRemaining < 0;
  const isWarning = timeRemaining < 3600000; // Less than 1 hour

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded ${
      isBreached ? 'bg-red-100 text-red-800' :
      isWarning ? 'bg-orange-100 text-orange-800' :
      'bg-green-100 text-green-800'
    }`}>
      <Clock size={14} />
      {isBreached ? (
        <span className="text-xs font-medium">SLA BREACHED {Math.abs(hours)}h {Math.abs(minutes)}m ago</span>
      ) : (
        <span className="text-xs font-medium">{hours}h {minutes}m until breach</span>
      )}
    </div>
  );
}
```

---

## 3. Auto-Assignment Logic

### **Team Availability & Round-Robin**

```typescript
// /lib/auto-assign.ts
export async function autoAssignToTeam(
  ticketId: string,
  departmentName: string,
) {
  // Get team members from department
  const { data: team } = await supabase
    .from("users")
    .select(
      "id, display_name, current_tickets_count, is_available",
    )
    .eq("department", departmentName)
    .eq("role", "operator")
    .eq("is_available", true)
    .order("current_tickets_count", { ascending: true })
    .limit(1)
    .single();

  if (!team) {
    // No available agents, leave unassigned
    return null;
  }

  // Assign ticket
  await supabase
    .from("incidents")
    .update({
      operator_id: team.id,
      status: "Assigned",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  // Increment agent's ticket count
  await supabase.rpc("increment_ticket_count", {
    user_id: team.id,
  });

  // Send notification
  await supabase.from("notifications").insert({
    user_id: team.id,
    type: "assignment",
    message: `New ticket ${ticketId} auto-assigned to you`,
    incident_id: ticketId,
  });

  return team.id;
}
```

---

## 4. Cross-Department Workflows

### **Example: HR + IT Name Change**

```typescript
// Create ticket with workflow
const ticket = await createTicketWithWorkflow({
  subject: "Employee name change",
  description: "Update Jane Smith to Jane Williams",
  caller_id: "user-123",
  workflow: "name_change",
});

// AI assigns to HR first
// HR completes their part
await completeWorkflowStep(ticket.id, "hr_update", {
  completed_by: hrUserId,
  notes: "Updated employee record in HR system",
});

// Automatically creates sub-ticket for IT
await createSubTicket({
  parent_ticket_id: ticket.id,
  subject: "Update system accounts for Jane Williams",
  department: "IT Support",
  description:
    "Update email, AD, and system accounts following HR name change",
});
```

---

## 5. Benefits

### **For Service Desk Agents:**

✅ No manual ticket assignment needed
✅ Balanced workload distribution
✅ Clear SLA timers prevent missed deadlines
✅ Automatic escalation for breached SLAs

### **For End Users:**

✅ Faster response times
✅ Tickets routed to correct expert immediately
✅ Transparent SLA expectations

### **For Managers:**

✅ Automated compliance with SLAs
✅ Real-time breach alerts
✅ Performance metrics per agent/team
✅ Reduced manual triaging workload

---

## 6. Implementation Checklist

- [ ] Set up OpenAI API integration
- [ ] Create SLA policy definitions
- [ ] Implement SLA calculator with business hours
- [ ] Create auto-assignment algorithm
- [ ] Build SLA countdown UI components
- [ ] Set up SLA breach notifications
- [ ] Create workflow engine for multi-department tickets
- [ ] Test AI categorization accuracy
- [ ] Configure department routing rules
- [ ] Enable real-time SLA tracking
- [ ] Build SLA reporting dashboard

---

This AI-powered system will dramatically reduce manual work and ensure consistent, fair ticket distribution across your teams! 🚀
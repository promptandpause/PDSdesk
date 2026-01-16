# Post UI/UX Revamp Backlog (Deferred Architecture Items)

This document captures the **items explicitly deferred** from the original “adult ITSM / domain-driven” architecture notes. These are intentionally **NOT implemented yet** and are meant to be addressed **after the UI/UX theme revamp**.

## Status summary (current)

### Implemented (subset)

- Microsoft SSO via Supabase Auth broker (Microsoft sign-in)
- Role checks / admin-gated UI sections (current role model includes `global_admin`)
- Ticketing improvements already shipped:
  - Escalate to Queue (bulk) to any active operator group
  - Ticket events/logging around escalation actions (directionally event-stream based)
  - DB/RPC-level safeguards preventing deletion of closed tickets
  - Unified ticket creation UX using the standard Ticket Detail create flow
- Queue Management admin tooling:
  - Operator Groups CRUD
  - Ticket Routing Rules CRUD

### Deferred (intentionally)

- UI/UX theme revamp + consistent component system
- Full end-to-end regression testing (planned after UI/UX revamp)

## 1) Identity & Access (complete RBAC + auditability)

### Required roles (from the original note)

- Admin
- Agent
- Manager
- End User
- Auditor (read-only)

### RBAC requirements (not ad-hoc checks)

- Centralized permission checks (avoid sprinkling role checks throughout views)
- Role assignments that can be audited and changed without code deploys
- Support “group admin” / scoped admin roles where required

### “Audit logs from day one” (not complete yet)

We need a dedicated audit log subsystem covering:

- Auth & identity events (sign-in, sign-out, role changes)
- CRUD on admin entities (operator groups, routing rules, workflow rules, asset changes, KB changes)
- Ticket actions (status change, assignment, escalation, SLA changes, deletes/attempted deletes)

Suggested approach:

- `audit_logs` table (append-only)
- Standardized server-side helper(s) to write audit events
- Enforce audit logging in RPCs / server-side functions (not UI)

### Tables (original suggestion)

- `users` (external ID from Azure)
- `roles`
- `role_assignments`
- `audit_logs`

## 2) Ticketing & Incident Management (event-stream-first)

Directionally we started event logging, but the full model is not complete.

### Needed

- Treat tickets as an immutable event stream
- Don’t overwrite history (append-only events for status/priority/SLA/assignment changes)
- “Conversation” threads:
  - internal vs external messages
  - attachments handling
- Worklog entries, including time tracking

### SLA

- SLA clock tracking as first-class
- SLA breach events + snapshots for reporting

## 3) Knowledge Base (versioned, lifecycle-managed)

Not implemented.

### Needed

- Versioned articles
- Approval workflow
- Public vs internal visibility
- Article ↔ Ticket linking
- Ticket → Article conversion
- Multilingual-ready structure

## 4) Workflow & Automation Engine

Not implemented.

### Needed

- Event triggers (ticket created, status changed, SLA breached)
- Declarative conditions (field values, time, role)
- Actions (assign, notify, call webhook, update field)
- Stored in DB
- Executed by workers (not API threads)

## 5) Asset Management & CMDB

Not implemented.

### Needed

- Assets, types, owners, locations, lifecycle state
- Linked tickets
- Later enhancements: barcodes, audits, depreciation, fleet/key mgmt

## 6) Dashboards & Analytics

Not implemented.

### Needed

- Precomputed metrics + time-series tables
- SLA performance snapshots
- Agent performance
- Workload distribution

Avoid computing everything live:

- Nightly jobs
- Materialized views / snapshots

## 7) Integrations & Events

Not implemented as a domain.

### Needed

- Central event bus pattern for domain events
- Microsoft integrations as first-class (Graph, calendars, tasks, Power Automate triggers)
- Webhooks / outbound notifications

## 8) Post UI/UX revamp testing checklist (when we resume)

After the UI/UX theme revamp, run end-to-end tests for:

- SSO login + role loading + deprovisioning behavior
- RBAC enforcement across all admin views
- Ticket event stream correctness (status, assignment, escalation, deletes)
- SLA clock behavior + breach events
- Workflow triggers/conditions/actions
- KB article lifecycle + ticket linking
- Assets/CMDB CRUD + ticket linking
- Reporting metrics correctness

## Notes

- The repository naming / folder layout guidance from the original note is intentionally ignored here (project was renamed and structure decisions may change).
- This backlog is meant to be “source of truth” for the **post-revamp** engineering plan.

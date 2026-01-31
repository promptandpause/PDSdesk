import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

type Json = Record<string, unknown>;

type TicketSlaRow = {
  ticket_id: string;
  first_response_due_at: string | null;
  resolution_due_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  first_response_breached: boolean;
  first_response_breached_at: string | null;
  resolution_breached: boolean;
  resolution_breached_at: string | null;
};

type TicketRow = {
  id: string;
  ticket_type: string;
  assignment_group_id: string | null;
};

type EscalationRow = {
  id: string;
  ticket_id: string;
  policy_id: string | null;
  status: string;
  current_step: number;
  next_run_at: string | null;
};

type EscalationPolicyRow = {
  id: string;
  match_ticket_type: string | null;
  match_assignment_group_id: string | null;
};

type EscalationStepRow = {
  id: string;
  step_order: number;
  delay_minutes: number;
  notify_user_id: string | null;
  notify_group_id: string | null;
  notify_channel: string;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-itsm-automation-secret",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

function nowIso() {
  return new Date().toISOString();
}

function parseIntSafe(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return fallback;
}

function extractFirstEmailAddress(value: string): string {
  const trimmed = value.trim();
  const angleMatch = trimmed.match(/<([^>]+)>/);
  const candidate = (angleMatch?.[1] ?? trimmed).trim();
  const first = candidate.split(/\s*,\s*/)[0]?.trim() ?? "";
  return first;
}

async function resendSendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${params.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status} ${text}`);
  }

  try {
    return JSON.parse(text) as { id?: string };
  } catch {
    return { id: undefined };
  }
}

async function requireSecret(req: Request) {
  const expected = Deno.env.get("ITSM_AUTOMATION_SECRET") ?? "";
  if (!expected) return { ok: false, error: "Missing ITSM_AUTOMATION_SECRET" } as const;

  // Check header first
  const headerSecret = req.headers.get("x-itsm-automation-secret") ?? "";
  if (headerSecret === expected) {
    return { ok: true } as const;
  }

  // Try to get from request body
  try {
    const body = await req.json() as any;
    if (body?.secret === expected) {
      return { ok: true } as const;
    }
    
    // Also check if the entire body is just the secret string
    if (typeof body === "string" && body === expected) {
      return { ok: true } as const;
    }
  } catch (e) {
    // If body parsing fails, try to read as text
    try {
      const text = await req.text();
      if (text === expected) {
        return { ok: true } as const;
      }
    } catch {
      // If all fails, return unauthorized
    }
  }

  return { ok: false, error: "Unauthorized" } as const;
}

async function runDirectorySync(params: {
  supabaseUrl: string;
  anonKey: string;
  automationSecret: string;
}) {
  const url = `${params.supabaseUrl.replace(/\/$/, "")}/functions/v1/graph-directory-sync`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: params.anonKey,
      "x-itsm-automation-secret": params.automationSecret,
    },
    body: JSON.stringify({}),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(`graph-directory-sync failed: ${res.status} ${text}`);
  }

  return json ?? { ok: true };
}

async function ensureSlaBreaches(params: {
  supabase: ReturnType<typeof createClient>;
  limit: number;
}) {
  const supabase = params.supabase;
  const now = new Date();

  const { data: rows, error } = await supabase
    .from("ticket_slas")
    .select(
      "ticket_id,first_response_due_at,resolution_due_at,first_response_at,resolved_at,first_response_breached,first_response_breached_at,resolution_breached,resolution_breached_at",
    )
    .or(
      "and(first_response_breached.eq.false,first_response_due_at.lte." + now.toISOString() + ",first_response_at.is.null),and(resolution_breached.eq.false,resolution_due_at.lte." + now.toISOString() + ",resolved_at.is.null)",
    )
    .limit(params.limit);

  if (error) throw error;

  let firstBreaches = 0;
  let resolutionBreaches = 0;

  for (const r of (rows ?? []) as unknown as TicketSlaRow[]) {
    const updates: Record<string, unknown> = {};
    const events: Array<{ event_type: string; payload: Json }> = [];

    if (
      !r.first_response_breached &&
      !r.first_response_at &&
      r.first_response_due_at &&
      new Date(r.first_response_due_at).getTime() <= now.getTime()
    ) {
      updates.first_response_breached = true;
      updates.first_response_breached_at = nowIso();
      events.push({
        event_type: "first_response_breached",
        payload: { at: updates.first_response_breached_at, due_at: r.first_response_due_at },
      });
      firstBreaches++;
    }

    if (
      !r.resolution_breached &&
      !r.resolved_at &&
      r.resolution_due_at &&
      new Date(r.resolution_due_at).getTime() <= now.getTime()
    ) {
      updates.resolution_breached = true;
      updates.resolution_breached_at = nowIso();
      events.push({
        event_type: "resolution_breached",
        payload: { at: updates.resolution_breached_at, due_at: r.resolution_due_at },
      });
      resolutionBreaches++;
    }

    if (Object.keys(updates).length) {
      const { error: upErr } = await supabase
        .from("ticket_slas")
        .update(updates)
        .eq("ticket_id", r.ticket_id);
      if (upErr) throw upErr;

      for (const e of events) {
        const { error: evErr } = await supabase.from("ticket_sla_events").insert({
          ticket_id: r.ticket_id,
          event_type: e.event_type,
          payload: e.payload,
        });
        if (evErr) throw evErr;
      }
    }
  }

  return { processed: (rows ?? []).length, firstBreaches, resolutionBreaches };
}

async function matchEscalationPolicy(params: {
  supabase: ReturnType<typeof createClient>;
  ticket: TicketRow;
}) {
  const supabase = params.supabase;

  const { data, error } = await supabase
    .from("escalation_policies")
    .select("id,match_ticket_type,match_assignment_group_id")
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (error) throw error;

  const policies = (data ?? []) as unknown as EscalationPolicyRow[];

  for (const p of policies) {
    if (p.match_ticket_type && p.match_ticket_type.toLowerCase() !== params.ticket.ticket_type.toLowerCase()) {
      continue;
    }
    if (p.match_assignment_group_id && p.match_assignment_group_id !== params.ticket.assignment_group_id) {
      continue;
    }
    return p.id;
  }

  return null;
}

async function ensureTicketEscalations(params: {
  supabase: ReturnType<typeof createClient>;
  limit: number;
}) {
  const supabase = params.supabase;

  const { data: breached, error } = await supabase
    .from("ticket_slas")
    .select("ticket_id")
    .eq("resolution_breached", true)
    .limit(params.limit);

  if (error) throw error;

  let created = 0;

  for (const row of (breached ?? []) as Array<{ ticket_id: string }>) {
    const ticketId = row.ticket_id;

    const { data: existing, error: exErr } = await supabase
      .from("ticket_escalations")
      .select("id")
      .eq("ticket_id", ticketId)
      .neq("status", "completed")
      .limit(1);

    if (exErr) throw exErr;
    if ((existing ?? []).length) continue;

    const { data: ticket, error: tErr } = await supabase
      .from("tickets")
      .select("id,ticket_type,assignment_group_id")
      .eq("id", ticketId)
      .maybeSingle();

    if (tErr) throw tErr;
    if (!ticket?.id) continue;

    const policyId = await matchEscalationPolicy({
      supabase,
      ticket: ticket as unknown as TicketRow,
    });

    const { data: ins, error: insErr } = await supabase
      .from("ticket_escalations")
      .insert({
        ticket_id: ticketId,
        policy_id: policyId,
        status: "open",
        current_step: 0,
        next_run_at: nowIso(),
      })
      .select("id")
      .maybeSingle();

    if (insErr) throw insErr;
    if (ins?.id) {
      created++;
      await supabase.from("ticket_escalation_events").insert({
        ticket_escalation_id: ins.id,
        event_type: "escalation_created",
        payload: { at: nowIso(), policy_id: policyId },
      });
    }
  }

  return { scanned: (breached ?? []).length, created };
}

async function advanceEscalations(params: {
  supabase: ReturnType<typeof createClient>;
  limit: number;
}) {
  const supabase = params.supabase;
  const now = new Date();

  const { data: escalations, error } = await supabase
    .from("ticket_escalations")
    .select("id,ticket_id,policy_id,status,current_step,next_run_at")
    .eq("status", "open")
    .or("next_run_at.is.null,next_run_at.lte." + now.toISOString())
    .limit(params.limit);

  if (error) throw error;

  let advanced = 0;
  let completed = 0;

  for (const e of (escalations ?? []) as unknown as EscalationRow[]) {
    if (!e.policy_id) {
      const { error: upErr } = await supabase
        .from("ticket_escalations")
        .update({ status: "completed", next_run_at: null })
        .eq("id", e.id);
      if (upErr) throw upErr;
      completed++;
      continue;
    }

    const nextStepOrder = (e.current_step ?? 0) + 1;

    const { data: step, error: stepErr } = await supabase
      .from("escalation_policy_steps")
      .select("id,step_order,delay_minutes,notify_user_id,notify_group_id,notify_channel")
      .eq("policy_id", e.policy_id)
      .eq("step_order", nextStepOrder)
      .maybeSingle();

    if (stepErr) throw stepErr;

    if (!step?.id) {
      const { error: upErr } = await supabase
        .from("ticket_escalations")
        .update({ status: "completed", next_run_at: null, current_step: nextStepOrder })
        .eq("id", e.id);
      if (upErr) throw upErr;
      completed++;
      continue;
    }

    const existingEventPayload = { step_order: nextStepOrder };
    const { data: priorEvents, error: peErr } = await supabase
      .from("ticket_escalation_events")
      .select("id")
      .eq("ticket_escalation_id", e.id)
      .eq("event_type", "step_executed")
      .contains("payload", existingEventPayload)
      .limit(1);

    if (peErr) throw peErr;

    if ((priorEvents ?? []).length) {
      const delayMinutes = (step as unknown as EscalationStepRow).delay_minutes ?? 0;
      const nextRunAt = new Date(now.getTime() + delayMinutes * 60_000).toISOString();
      const { error: upErr } = await supabase
        .from("ticket_escalations")
        .update({ next_run_at: nextRunAt })
        .eq("id", e.id);
      if (upErr) throw upErr;
      continue;
    }

    const s = step as unknown as EscalationStepRow;

    const { error: evErr } = await supabase.from("ticket_escalation_events").insert({
      ticket_escalation_id: e.id,
      event_type: "step_executed",
      payload: {
        at: nowIso(),
        step_order: s.step_order,
        notify_user_id: s.notify_user_id,
        notify_group_id: s.notify_group_id,
        notify_channel: s.notify_channel,
        delay_minutes: s.delay_minutes,
      },
    });
    if (evErr) throw evErr;

    const delayMinutes = s.delay_minutes ?? 0;
    const nextRunAt = new Date(now.getTime() + delayMinutes * 60_000).toISOString();

    const { error: upErr } = await supabase
      .from("ticket_escalations")
      .update({ current_step: s.step_order, next_run_at: nextRunAt })
      .eq("id", e.id);
    if (upErr) throw upErr;

    advanced++;
  }

  return { scanned: (escalations ?? []).length, advanced, completed };
}

type TicketCloseCandidate = {
  id: string;
  ticket_type: string;
  ticket_number: string;
  title: string;
  resolved_at: string | null;
  requester_email: string | null;
  requester_name: string | null;
  requester: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null;
};

type PendingTicketCandidate = {
  id: string;
  ticket_type: string;
  ticket_number: string;
  title: string;
  updated_at: string;
  requester_id: string;
  requester_email: string | null;
  requester_name: string | null;
  requester: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null;
};

function normalizeProfile<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function autoCloseResolvedTickets(params: {
  supabase: ReturnType<typeof createClient>;
  limit: number;
  now: Date;
}) {
  const supabase = params.supabase;
  const cutoff = new Date(params.now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const { data: candidates, error } = await supabase
    .from("tickets")
    .select(
      "id,ticket_type,ticket_number,title,resolved_at,requester_email,requester_name,requester:profiles!tickets_requester_id_fkey(email,full_name)",
    )
    .eq("status", "resolved")
    .not("resolved_at", "is", null)
    .lte("resolved_at", cutoff.toISOString())
    .limit(params.limit);

  if (error) throw error;

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const SUPPORT_FROM_EMAIL = Deno.env.get("SUPPORT_FROM_EMAIL") ?? "support@promptandpause.com";
  const PDSDESK_APP_URL =
    Deno.env.get("PDSDESK_APP_URL") ??
    Deno.env.get("ITSM_APP_URL") ??
    "https://servicedesk.promptandpause.com";

  let closed = 0;
  let emailed = 0;
  let emailSkipped = 0;
  let emailFailed = 0;

  for (const t of (candidates ?? []) as unknown as TicketCloseCandidate[]) {
    const upd = await supabase
      .from("tickets")
      .update({ status: "closed" })
      .eq("id", t.id)
      .eq("status", "resolved");

    if (upd.error) {
      throw upd.error;
    }

    closed++;

    const { error: evErr } = await supabase.from("ticket_events").insert({
      ticket_id: t.id,
      actor_id: null,
      event_type: "ticket_status_changed",
      payload: {
        from: "resolved",
        to: "closed",
        reason: "auto_close",
        at: nowIso(),
      },
    });
    if (evErr) throw evErr;

    // If email infrastructure isn't configured, skip sending but still close.
    if (!RESEND_API_KEY) {
      emailSkipped++;
      continue;
    }

    // Prevent duplicate sends.
    const { data: prior } = await supabase
      .from("ticket_events")
      .select("id")
      .eq("ticket_id", t.id)
      .eq("event_type", "satisfaction_email_sent")
      .limit(1);
    if ((prior ?? []).length) {
      emailSkipped++;
      continue;
    }

    const requester = normalizeProfile(t.requester);
    const toEmailRaw =
      (typeof t.requester_email === "string" && t.requester_email.trim())
        ? t.requester_email.trim()
        : requester?.email ?? "";

    const toEmail = toEmailRaw ? extractFirstEmailAddress(toEmailRaw) : "";
    if (!toEmail) {
      emailSkipped++;
      continue;
    }

    const requesterName =
      (t.requester_name ?? "").trim() ||
      (requester?.full_name ?? "").trim() ||
      toEmail.split("@")[0];

    const subject = `How did we do? (Ticket #${t.ticket_number})`;
    const module = (t.ticket_type ?? "").toLowerCase() === "customer_service" ? "customer-support-queue" : "call-management";
    const appLink = `${PDSDESK_APP_URL}/#/${module}?ticketId=${encodeURIComponent(t.id)}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p style="margin: 0 0 16px 0;">Hi ${requesterName},</p>
        <p style="margin: 0 0 16px 0;">Your ticket <strong>#${t.ticket_number}</strong> has been closed.</p>
        <p style="margin: 0 0 16px 0;">We’d really appreciate it if you could rate your experience.</p>
        <p style="margin: 0 0 16px 0;">
          <a href="${appLink}" style="display: inline-block; padding: 10px 14px; border-radius: 8px; background: #4f46e5; color: #ffffff; text-decoration: none;">Open Service Desk</a>
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Open the ticket and use the Customer Satisfaction tab to leave a rating.</p>
      </div>
    `;

    try {
      const sendResult = await resendSendEmail({
        apiKey: RESEND_API_KEY,
        from: SUPPORT_FROM_EMAIL,
        to: toEmail,
        subject,
        html,
      });

      const { error: sentErr } = await supabase.from("ticket_events").insert({
        ticket_id: t.id,
        actor_id: null,
        event_type: "satisfaction_email_sent",
        payload: {
          at: nowIso(),
          resend_id: sendResult.id ?? null,
          to: toEmail,
        },
      });
      if (sentErr) throw sentErr;

      emailed++;
    } catch {
      emailFailed++;
    }
  }

  return {
    scanned: (candidates ?? []).length,
    cutoff: cutoff.toISOString(),
    closed,
    emailed,
    emailSkipped,
    emailFailed,
  };
}

async function autoClosePendingTickets(params: {
  supabase: ReturnType<typeof createClient>;
  limit: number;
  now: Date;
}) {
  const supabase = params.supabase;
  // 5 days without customer response
  const cutoff = new Date(params.now.getTime() - 5 * 24 * 60 * 60 * 1000);

  // Find tickets in "pending" status where updated_at is older than 5 days
  // "pending" status means we're waiting for customer response
  const { data: candidates, error } = await supabase
    .from("tickets")
    .select(
      "id,ticket_type,ticket_number,title,updated_at,requester_id,requester_email,requester_name,requester:profiles!tickets_requester_id_fkey(email,full_name)",
    )
    .eq("status", "pending")
    .lte("updated_at", cutoff.toISOString())
    .limit(params.limit);

  if (error) throw error;

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const SUPPORT_FROM_EMAIL = Deno.env.get("SUPPORT_FROM_EMAIL") ?? "support@promptandpause.com";
  const PDSDESK_APP_URL =
    Deno.env.get("PDSDESK_APP_URL") ??
    Deno.env.get("ITSM_APP_URL") ??
    "https://servicedesk.promptandpause.com";

  let closed = 0;
  let emailed = 0;
  let emailSkipped = 0;
  let emailFailed = 0;

  for (const t of (candidates ?? []) as unknown as PendingTicketCandidate[]) {
    // Check if there's been any customer comment since the ticket went pending
    // by looking for non-internal comments from the requester after the last agent action
    const { data: recentCustomerComments } = await supabase
      .from("ticket_comments")
      .select("id,created_at")
      .eq("ticket_id", t.id)
      .eq("author_id", t.requester_id)
      .eq("is_internal", false)
      .gt("created_at", cutoff.toISOString())
      .limit(1);

    // If customer has responded recently, skip this ticket
    if ((recentCustomerComments ?? []).length > 0) {
      continue;
    }

    // Close the ticket
    const upd = await supabase
      .from("tickets")
      .update({ status: "closed" })
      .eq("id", t.id)
      .eq("status", "pending");

    if (upd.error) {
      throw upd.error;
    }

    closed++;

    // Add auto-close comment
    const autoCloseComment = `This ticket has been automatically closed due to no response from the requester for 5 days. If you still need assistance, please submit a new ticket or reply to reopen this one.`;
    
    await supabase.from("ticket_comments").insert({
      ticket_id: t.id,
      author_id: t.requester_id, // Use requester_id as a fallback, ideally would be system user
      body: autoCloseComment,
      is_internal: false,
    });

    // Log the event
    const { error: evErr } = await supabase.from("ticket_events").insert({
      ticket_id: t.id,
      actor_id: null,
      event_type: "ticket_status_changed",
      payload: {
        from: "pending",
        to: "closed",
        reason: "auto_close_no_response",
        at: nowIso(),
        days_inactive: 5,
      },
    });
    if (evErr) throw evErr;

    // Send email notification to requester
    if (!RESEND_API_KEY) {
      emailSkipped++;
      continue;
    }

    // Prevent duplicate sends
    const { data: prior } = await supabase
      .from("ticket_events")
      .select("id")
      .eq("ticket_id", t.id)
      .eq("event_type", "auto_close_email_sent")
      .limit(1);
    if ((prior ?? []).length) {
      emailSkipped++;
      continue;
    }

    const requester = normalizeProfile(t.requester);
    const toEmailRaw =
      (typeof t.requester_email === "string" && t.requester_email.trim())
        ? t.requester_email.trim()
        : requester?.email ?? "";

    const toEmail = toEmailRaw ? extractFirstEmailAddress(toEmailRaw) : "";
    if (!toEmail) {
      emailSkipped++;
      continue;
    }

    const requesterName =
      (t.requester_name ?? "").trim() ||
      (requester?.full_name ?? "").trim() ||
      toEmail.split("@")[0];

    const subject = `Ticket #${t.ticket_number} has been closed - No response received`;
    const module = (t.ticket_type ?? "").toLowerCase() === "customer_service" ? "customer-support-queue" : "call-management";
    const appLink = `${PDSDESK_APP_URL}/#/${module}?ticketId=${encodeURIComponent(t.id)}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p style="margin: 0 0 16px 0;">Hi ${requesterName},</p>
        <p style="margin: 0 0 16px 0;">Your ticket <strong>#${t.ticket_number}</strong> - "${t.title}" has been automatically closed because we haven't received a response from you in the last 5 days.</p>
        <p style="margin: 0 0 16px 0;">If you still need assistance with this issue, you can:</p>
        <ul style="margin: 0 0 16px 0; padding-left: 20px;">
          <li>Reply to this email to reopen the ticket</li>
          <li>Submit a new ticket through PDSdesk</li>
        </ul>
        <p style="margin: 0 0 16px 0;">
          <a href="${appLink}" style="display: inline-block; padding: 10px 14px; border-radius: 8px; background: #4f46e5; color: #ffffff; text-decoration: none;">View Ticket</a>
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Thank you for using PDSdesk.</p>
      </div>
    `;

    try {
      const sendResult = await resendSendEmail({
        apiKey: RESEND_API_KEY,
        from: SUPPORT_FROM_EMAIL,
        to: toEmail,
        subject,
        html,
      });

      const { error: sentErr } = await supabase.from("ticket_events").insert({
        ticket_id: t.id,
        actor_id: null,
        event_type: "auto_close_email_sent",
        payload: {
          at: nowIso(),
          resend_id: sendResult.id ?? null,
          to: toEmail,
          reason: "no_response_5_days",
        },
      });
      if (sentErr) throw sentErr;

      emailed++;
    } catch {
      emailFailed++;
    }
  }

  return {
    scanned: (candidates ?? []).length,
    cutoff: cutoff.toISOString(),
    closed,
    emailed,
    emailSkipped,
    emailFailed,
  };
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    // Check automation secret first (bypasses Supabase auth)
    const auth = await requireSecret(req);
    if (!auth.ok) {
      return json(401, { error: auth.error });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ITSM_AUTOMATION_SECRET = Deno.env.get("ITSM_AUTOMATION_SECRET") ?? "";
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !ITSM_AUTOMATION_SECRET) {
      return json(500, {
        error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / ITSM_AUTOMATION_SECRET",
      });
    }

    let body: Json = {};
    try {
      // Clone the request to avoid body consumption issues
      const clonedReq = req.clone();
      body = (await clonedReq.json()) as Json;
    } catch {
      body = {};
    }

    const limit = Math.max(1, Math.min(500, parseIntSafe(body.limit, 200)));
    const url = new URL(req.url);
    const shouldRunDirectorySync =
      Boolean((body as any)?.run_directory_sync) ||
      (req.headers.get("x-run-directory-sync") ?? "").toLowerCase() === "true" ||
      (url.searchParams.get("run_directory_sync") ?? "") === "1";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const slaBreaches = await ensureSlaBreaches({ supabase, limit });
    const escalationSeeds = await ensureTicketEscalations({ supabase, limit });
    const escalationAdvances = await advanceEscalations({ supabase, limit });
    const autoCloseResolved = await autoCloseResolvedTickets({ supabase, limit, now });
    const autoClosePending = await autoClosePendingTickets({ supabase, limit, now });

    const directorySync = shouldRunDirectorySync
      ? await runDirectorySync({
          supabaseUrl: SUPABASE_URL,
          anonKey: SUPABASE_ANON_KEY,
          automationSecret: ITSM_AUTOMATION_SECRET,
        })
      : null;

    return json(200, {
      success: true,
      at: nowIso(),
      limit,
      slaBreaches,
      escalationSeeds,
      escalationAdvances,
      autoCloseResolved,
      autoClosePending,
      directorySync,
    });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return json(500, { error: "Internal Server Error", details: msg });
  }
});

export {};
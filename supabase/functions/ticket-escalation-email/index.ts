import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

type Json = Record<string, unknown>;

type TicketRow = {
  id: string;
  ticket_number: string;
  title: string;
  ticket_type: string;
  assignment_group_id: string | null;
  assignee_id: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
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

function getBearerToken(req: Request): string | null {
  const candidates = [
    req.headers.get("authorization"),
    req.headers.get("Authorization"),
    req.headers.get("x-forwarded-authorization"),
    req.headers.get("x-supabase-authorization"),
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    const auth = raw.trim();
    if (auth.toLowerCase().startsWith("bearer ")) {
      return auth.slice("bearer ".length).trim();
    }
  }

  return null;
}

function extractFirstEmailAddress(value: string): string {
  const trimmed = value.trim();
  const angleMatch = trimmed.match(/<([^>]+)>/);
  const candidate = (angleMatch?.[1] ?? trimmed).trim();
  const first = candidate.split(/\s*,\s*/)[0]?.trim() ?? "";
  return first;
}

function uniqueNonEmptyStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
}

async function resendSendEmail(params: {
  apiKey: string;
  from: string;
  to: string[];
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

async function getGroupMemberEmails(params: {
  supabaseAdmin: ReturnType<typeof createClient>;
  groupId: string;
}) {
  const { data, error } = await params.supabaseAdmin
    .from("operator_group_members")
    .select("user:profiles!operator_group_members_user_id_fkey(id,email,full_name)")
    .eq("group_id", params.groupId);

  if (error) throw error;

  const emails: string[] = [];
  for (const row of (data ?? []) as any[]) {
    const u = Array.isArray(row?.user) ? row.user[0] : row?.user;
    const email = typeof u?.email === "string" ? u.email.trim() : "";
    if (email) emails.push(extractFirstEmailAddress(email));
  }

  return uniqueNonEmptyStrings(emails);
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
    const SUPPORT_FROM_EMAIL = Deno.env.get("SUPPORT_FROM_EMAIL") ?? "support@promptandpause.com";
    const PDSDESK_APP_URL =
      Deno.env.get("PDSDESK_APP_URL") ??
      Deno.env.get("ITSM_APP_URL") ??
      "https://servicedesk.promptandpause.com";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" });
    }
    if (!RESEND_API_KEY) {
      return json(500, { error: "Missing RESEND_API_KEY" });
    }

    const token = getBearerToken(req);
    if (!token) {
      const headerKeys = Array.from(req.headers.keys());
      return json(401, {
        error: "Unauthorized",
        details: "Missing bearer token",
        header_keys: headerKeys,
      });
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    const {
      ticketId,
      toAssignmentGroupId,
      toAssigneeId,
      note,
      notifyAssignee,
      notifyGroup,
      excludeActor,
    } = (payload ?? {}) as {
      ticketId?: string;
      toAssignmentGroupId?: string | null;
      toAssigneeId?: string | null;
      note?: string | null;
      notifyAssignee?: boolean;
      notifyGroup?: boolean;
      excludeActor?: boolean;
    };

    if (!ticketId) {
      return json(400, { error: "ticketId is required" });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    let actorId: string | null = null;
    let actorEmail: string | null = null;

    const userAuthRes = await supabaseUser.auth.getUser();
    if (userAuthRes.error || !userAuthRes.data?.user) {
      const adminAuthRes = await supabaseAdmin.auth.getUser(token);
      if (adminAuthRes.error || !adminAuthRes.data?.user) {
        return json(401, {
          error: "Unauthorized",
          details: userAuthRes.error?.message ?? "supabaseUser.auth.getUser(): No user returned",
          details_admin: adminAuthRes.error?.message ?? "supabaseAdmin.auth.getUser(token): No user returned",
        });
      }
      actorId = adminAuthRes.data.user.id;
      actorEmail = adminAuthRes.data.user.email ?? null;
    } else {
      actorId = userAuthRes.data.user.id;
      actorEmail = userAuthRes.data.user.email ?? null;
    }

    if (!actorId) return json(401, { error: "Unauthorized" });

    const { data: ticketData, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select("id,ticket_number,title,ticket_type,assignment_group_id,assignee_id")
      .eq("id", ticketId)
      .maybeSingle();
    if (ticketError) {
      return json(500, { error: "Failed to load ticket" });
    }
    const ticket = ticketData as unknown as TicketRow | null;
    if (!ticket?.id) {
      return json(404, { error: "Ticket not found" });
    }

    const { data: canWorkTickets, error: canWorkError } = await supabaseUser.rpc("can_work_tickets");
    if (canWorkError) {
      return json(500, { error: "Failed to check permissions" });
    }

    let isAgent = Boolean(canWorkTickets) || ticket.assignee_id === actorId;
    if (!isAgent && ticket.ticket_type === "customer_service") {
      const { data: isInCs, error: csErr } = await supabaseUser.rpc("is_in_operator_group", {
        required_group_key: "customer_service",
      });
      if (csErr) {
        return json(500, { error: "Failed to check operator group" });
      }
      isAgent = Boolean(isInCs);
    }

    if (!isAgent) {
      return json(403, { error: "Forbidden" });
    }

    const recipients: string[] = [];

    if (notifyAssignee && toAssigneeId) {
      const { data: assigneeProfile, error: assigneeErr } = await supabaseAdmin
        .from("profiles")
        .select("id,email,full_name")
        .eq("id", toAssigneeId)
        .maybeSingle();
      if (assigneeErr) throw assigneeErr;
      const p = assigneeProfile as unknown as ProfileRow | null;
      if (p?.email) {
        recipients.push(extractFirstEmailAddress(p.email));
      }
    }

    if (notifyGroup && toAssignmentGroupId) {
      const groupEmails = await getGroupMemberEmails({
        supabaseAdmin,
        groupId: toAssignmentGroupId,
      });
      recipients.push(...groupEmails);
    }

    const normalizedRecipients = uniqueNonEmptyStrings(recipients);
    const finalRecipients = excludeActor
      ? normalizedRecipients.filter((e) => e.toLowerCase() !== String(actorEmail ?? "").toLowerCase())
      : normalizedRecipients;

    if (!finalRecipients.length) {
      return json(400, { error: "No recipients" });
    }

    const safeNote = typeof note === "string" ? note.trim() : "";
    const subject = `Ticket ${ticket.ticket_number} escalated`;
    const appLink = `${PDSDESK_APP_URL}/#/call-management`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p style="margin: 0 0 16px 0;"><strong>${ticket.ticket_number}</strong> has been escalated.</p>
        <p style="margin: 0 0 8px 0;"><strong>Title:</strong> ${ticket.title}</p>
        ${safeNote ? `<p style="margin: 0 0 16px 0;"><strong>Note:</strong><br/>${safeNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : ""}
        <p style="margin: 0 0 16px 0;">
          <a href="${appLink}" style="display: inline-block; padding: 10px 14px; border-radius: 8px; background: #4f46e5; color: #ffffff; text-decoration: none;">Open Service Desk</a>
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Search for ${ticket.ticket_number} in Call Management.</p>
      </div>
    `;

    const sendResult = await resendSendEmail({
      apiKey: RESEND_API_KEY,
      from: SUPPORT_FROM_EMAIL,
      to: finalRecipients,
      subject,
      html,
    });

    await supabaseAdmin.from("ticket_events").insert({
      ticket_id: ticket.id,
      actor_id: actorId,
      event_type: "escalation_notification_sent",
      payload: {
        at: nowIso(),
        channel: "email",
        to_assignment_group_id: toAssignmentGroupId ?? null,
        to_assignee_id: toAssigneeId ?? null,
        recipients: finalRecipients,
        resend_id: sendResult.id ?? null,
        meta: {
          notify_assignee: !!notifyAssignee,
          notify_group: !!notifyGroup,
        },
      } satisfies Json,
    });

    return json(200, {
      success: true,
      sent: finalRecipients.length,
      resend_id: sendResult.id ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return json(500, { error: "Internal Server Error", details: msg });
  }
});

export {};

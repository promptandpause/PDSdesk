import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

type TicketRequester = {
  email: string | null;
  full_name: string | null;
};

type TicketRow = {
  ticket_number: string;
  title: string;
  requester_email?: string | null;
  requester_name?: string | null;
  requester: TicketRequester | TicketRequester[] | null;
};

type CommentRow = {
  body: string;
  is_internal: boolean;
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

function normalizeProfile<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function extractFirstEmailAddress(value: string): string {
  const trimmed = value.trim();
  const angleMatch = trimmed.match(/<([^>]+)>/);
  const candidate = (angleMatch?.[1] ?? trimmed).trim();
  const first = candidate.split(/\s*,\s*/)[0]?.trim() ?? "";
  return first;
}

function makeReplyToPlusAddress(mailbox: string, ticketNumber: string): string {
  const cleanMailbox = extractFirstEmailAddress(mailbox);
  const at = cleanMailbox.indexOf("@");
  if (at === -1) return cleanMailbox;
  const local = cleanMailbox.slice(0, at);
  const domain = cleanMailbox.slice(at + 1);
  const safeTicket = ticketNumber.trim();
  return `${local}+${safeTicket}@${domain}`;
}

async function resendSendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
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
      ...(params.replyTo ? { reply_to: params.replyTo } : null),
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
    const SUPPORT_REPLY_MAILBOX =
      Deno.env.get("MSGRAPH_SHARED_MAILBOX") ??
      Deno.env.get("SUPPORT_REPLY_MAILBOX") ??
      "support@promptandpause.com";

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

    const { ticketId, commentId } = (payload ?? {}) as {
      ticketId?: string;
      commentId?: string;
    };

    if (!ticketId || !commentId) {
      return json(400, { error: "ticketId and commentId are required" });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    let authData: { user: { id: string; email?: string | null } } | null = null;
    let authDetails: string | null = null;

    const userAuthRes = await supabaseUser.auth.getUser();
    if (userAuthRes.error || !userAuthRes.data?.user) {
      authDetails = userAuthRes.error?.message ?? "supabaseUser.auth.getUser(): No user returned";
      const adminAuthRes = await supabaseAdmin.auth.getUser(token);
      if (adminAuthRes.error || !adminAuthRes.data?.user) {
        return json(401, {
          error: "Unauthorized",
          details: authDetails,
          details_admin: adminAuthRes.error?.message ?? "supabaseAdmin.auth.getUser(token): No user returned",
        });
      }
      authData = adminAuthRes.data as unknown as { user: { id: string; email?: string | null } };
    } else {
      authData = userAuthRes.data as unknown as { user: { id: string; email?: string | null } };
    }

    const { data: canWorkTickets, error: canWorkError } = await supabaseUser.rpc(
      "can_work_tickets",
    );

    if (canWorkError) {
      return json(500, { error: "Failed to check permissions" });
    }
    if (!canWorkTickets) {
      return json(403, { error: "Forbidden" });
    }

    const { data: ticketData, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select(
        "ticket_number,title,requester_email,requester_name,requester:profiles!tickets_requester_id_fkey(email,full_name)",
      )
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) {
      return json(500, { error: "Failed to load ticket" });
    }

    const ticket = ticketData as unknown as TicketRow | null;
    if (!ticket?.ticket_number) {
      return json(404, { error: "Ticket not found" });
    }

    const requester = normalizeProfile(ticket.requester);
    const toEmailRaw =
      typeof ticket.requester_email === "string" && ticket.requester_email.trim()
        ? ticket.requester_email.trim()
        : requester?.email ?? "";

    const toEmail = toEmailRaw ? extractFirstEmailAddress(toEmailRaw) : "";
    if (!toEmail) {
      return json(400, { error: "Ticket requester has no email" });
    }

    const { data: commentData, error: commentError } = await supabaseAdmin
      .from("ticket_comments")
      .select("body,is_internal")
      .eq("id", commentId)
      .eq("ticket_id", ticketId)
      .maybeSingle();

    if (commentError) {
      return json(500, { error: "Failed to load comment" });
    }

    const comment = commentData as unknown as CommentRow | null;
    if (!comment) {
      return json(404, { error: "Comment not found" });
    }

    if (comment.is_internal) {
      return json(200, { success: true, skipped: true, reason: "internal_comment" });
    }

    const subject = `[Ticket #${ticket.ticket_number}] ${ticket.title}`;
    const replyTo = makeReplyToPlusAddress(SUPPORT_REPLY_MAILBOX, ticket.ticket_number);

    const requesterName =
      ticket.requester_name ||
      requester?.full_name ||
      toEmail.split("@")[0];
    const agentName = authData?.user?.email ?? "Support";

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p style="margin: 0 0 16px 0;">Hi ${requesterName},</p>
        <p style="margin: 0 0 16px 0;">We replied to your ticket <strong>#${ticket.ticket_number}</strong>:</p>
        <div style="background: #f9fafb; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${comment.body}</div>
        <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">Reply to this email to add more details. (Agent: ${agentName})</p>
      </div>
    `;

    const sendResult = await resendSendEmail({
      apiKey: RESEND_API_KEY,
      from: SUPPORT_FROM_EMAIL,
      to: toEmail,
      subject,
      html,
      replyTo,
    });

    return json(200, { success: true, resendId: sendResult.id ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ticket-comment-email error", msg);
    return json(500, { error: "Internal Server Error", details: msg });
  }
});

export {};

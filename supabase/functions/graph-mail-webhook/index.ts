import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

type GraphEmailAddress = { address?: string; name?: string };

type GraphMessage = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: GraphEmailAddress };
  toRecipients?: Array<{ emailAddress?: GraphEmailAddress }>;
  ccRecipients?: Array<{ emailAddress?: GraphEmailAddress }>;
  receivedDateTime?: string;
  internetMessageId?: string;
  conversationId?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPPORT_SYSTEM_USER_ID = Deno.env.get("SUPPORT_SYSTEM_USER_ID") ?? "";

const TENANT_ID = Deno.env.get("MSGRAPH_TENANT_ID") ?? "";
const CLIENT_ID = Deno.env.get("MSGRAPH_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("MSGRAPH_CLIENT_SECRET") ?? "";
const CLIENT_STATE = Deno.env.get("MSGRAPH_WEBHOOK_CLIENT_STATE") ?? "";
const SHARED_MAILBOX =
  Deno.env.get("MSGRAPH_SHARED_MAILBOX") ?? "support@promptandpause.com";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}
if (!SUPPORT_SYSTEM_USER_ID) {
  throw new Error(
    "Missing SUPPORT_SYSTEM_USER_ID (must be an existing profiles.id UUID)",
  );
}
if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !CLIENT_STATE) {
  throw new Error("Missing required MSGRAPH_* env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let cachedToken: { accessToken: string; expiresAtMs: number } | null = null;

async function logIngestError(input: {
  stage: string;
  error: unknown;
  messageId?: string;
  internetMessageId?: string;
  ticketNumber?: string | null;
}) {
  const errorText =
    input.error instanceof Error
      ? `${input.error.name}: ${input.error.message}`
      : String(input.error);

  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: null,
      action: "graph_mail_webhook_error",
      entity_type: "email",
      entity_id: null,
      metadata: {
        stage: input.stage,
        error: errorText,
        messageId: input.messageId,
        internetMessageId: input.internetMessageId,
        ticketNumber: input.ticketNumber,
      },
    });
  } catch (e) {
    console.error("graph-mail-webhook failed to persist audit log", e);
  }
}

async function getGraphToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAtMs - 60_000) {
    return cachedToken.accessToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams();
  body.set("client_id", CLIENT_ID);
  body.set("client_secret", CLIENT_SECRET);
  body.set("grant_type", "client_credentials");
  body.set("scope", "https://graph.microsoft.com/.default");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: json.access_token,
    expiresAtMs: now + json.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function extractTicketNumberFromText(text: string | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\bT-\d{4}-\d{6}\b/);
  return m?.[0] ?? null;
}

function mailboxLocalPart(mailbox: string): string {
  return mailbox.split("@")[0]?.toLowerCase() ?? "support";
}

function extractTicketNumberFromRecipients(msg: GraphMessage): string | null {
  const base = mailboxLocalPart(SHARED_MAILBOX);

  const addrs: string[] = [];
  for (const r of msg.toRecipients ?? []) addrs.push(r?.emailAddress?.address ?? "");
  for (const r of msg.ccRecipients ?? []) addrs.push(r?.emailAddress?.address ?? "");

  for (const a of addrs) {
    const addr = a.toLowerCase();
    const re = new RegExp(`\\b${base}\\+([^@]+)@`, "i");
    const m = addr.match(re);
    if (!m?.[1]) continue;

    const tag = m[1].toUpperCase();
    const ticketNumber = extractTicketNumberFromText(tag);
    if (ticketNumber) return ticketNumber;
  }

  return null;
}

async function fetchMessage(messageId: string): Promise<GraphMessage> {
  const token = await getGraphToken();
  const select =
    "id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,internetMessageId,conversationId";

  const url =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SHARED_MAILBOX)}/messages/${encodeURIComponent(messageId)}?$select=${encodeURIComponent(select)}`;

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Fetch message failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as GraphMessage;
}

async function findExistingTicketByTicketNumber(ticketNumber: string) {
  const { data, error } = await supabaseAdmin
    .from("tickets")
    .select("id")
    .eq("ticket_number", ticketNumber)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

async function findExistingTicketByConversationId(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("ticket_events")
    .select("ticket_id")
    .eq("event_type", "email_ingested")
    .contains("payload", { conversationId })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data ?? [])[0]?.ticket_id ?? null;
}

async function dedupeAlreadyProcessed(
  internetMessageId?: string,
  messageId?: string,
): Promise<boolean> {
  const key = internetMessageId ?? messageId;
  if (!key) return false;

  const { data, error } = await supabaseAdmin
    .from("ticket_events")
    .select("id")
    .eq("event_type", "email_ingested")
    .contains("payload", { key })
    .limit(1);

  if (error) return false;
  return (data ?? []).length > 0;
}

async function writeDedupeEvent(
  ticketId: string,
  internetMessageId?: string,
  messageId?: string,
  conversationId?: string,
  ticketNumber?: string | null,
  subject?: string | null,
) {
  const key = internetMessageId ?? messageId;
  if (!key) return;

  await supabaseAdmin.from("ticket_events").insert({
    ticket_id: ticketId,
    actor_id: SUPPORT_SYSTEM_USER_ID,
    event_type: "email_ingested",
    payload: {
      key,
      internetMessageId,
      messageId,
      conversationId,
      ticketNumber,
      subject,
    },
  });
}

function formatInboundMetadata(msg: GraphMessage): string {
  const fromAddress = msg.from?.emailAddress?.address ?? "unknown";
  const fromName = msg.from?.emailAddress?.name ?? "";
  const fromLine = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

  return (
    `Inbound email from: ${fromLine}\n` +
    `Received: ${msg.receivedDateTime ?? ""}\n` +
    `MessageId: ${msg.internetMessageId ?? msg.id}\n` +
    `ConversationId: ${msg.conversationId ?? ""}\n`
  );
}

function normalizeBody(msg: GraphMessage): string {
  const raw = msg.body?.content ?? msg.bodyPreview ?? "";
  const contentType = (msg.body?.contentType ?? "").toLowerCase();
  if (contentType === "html") return stripHtml(raw);
  return (raw ?? "").trim();
}

function extractTicketNumberFromMessage(msg: GraphMessage): string | null {
  return (
    extractTicketNumberFromRecipients(msg) ??
    extractTicketNumberFromText(msg.subject) ??
    extractTicketNumberFromText(normalizeBody(msg))
  );
}

async function createTicketFromEmail(
  msg: GraphMessage,
): Promise<{ id: string; ticketNumber: string | null }> {
  const subject = (msg.subject ?? "(no subject)").trim();
  const description = `${formatInboundMetadata(msg)}\n${normalizeBody(msg)}`;

  const requesterEmail = (msg.from?.emailAddress?.address ?? "").trim() || null;
  const requesterName = (msg.from?.emailAddress?.name ?? "").trim() || null;

  const { data, error } = await supabaseAdmin
    .from("tickets")
    .insert({
      title: subject,
      description,
      status: "new",
      priority: "medium",
      category: "Customer Support",
      requester_id: SUPPORT_SYSTEM_USER_ID,
      requester_email: requesterEmail,
      requester_name: requesterName,
      created_by: SUPPORT_SYSTEM_USER_ID,
      ticket_type: "customer_service",
      channel: "email",
      mailbox: SHARED_MAILBOX,
    })
    .select("id,ticket_number")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("Ticket insert succeeded but no id returned");
  const ticketNumber = (data as any).ticket_number as string | undefined;
  return { id: data.id, ticketNumber: ticketNumber ?? null };
}

async function appendCommentFromEmail(ticketId: string, msg: GraphMessage) {
  const body = `${formatInboundMetadata(msg)}\n${normalizeBody(msg)}`;

  const { error } = await supabaseAdmin.from("ticket_comments").insert({
    ticket_id: ticketId,
    author_id: SUPPORT_SYSTEM_USER_ID,
    body,
    is_internal: false,
  });
  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }

  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const notifications: any[] = payload?.value ?? [];

  const ack = new Response("Accepted", { status: 202 });

  (async () => {
    for (const n of notifications) {
      try {
        if (n?.clientState !== CLIENT_STATE) continue;

        const messageId = n?.resourceData?.id as string | undefined;
        if (!messageId) continue;

        const msg = await fetchMessage(messageId);

        const already = await dedupeAlreadyProcessed(msg.internetMessageId, msg.id);
        if (already) continue;

        const ticketNumber = extractTicketNumberFromMessage(msg);

        let ticketId: string | null = null;
        if (ticketNumber) {
          ticketId = await findExistingTicketByTicketNumber(ticketNumber);
        }

        if (!ticketId && msg.conversationId) {
          ticketId = await findExistingTicketByConversationId(msg.conversationId);
        }

        if (!ticketId) {
          const created = await createTicketFromEmail(msg);
          ticketId = created.id;
          await writeDedupeEvent(
            ticketId,
            msg.internetMessageId,
            msg.id,
            msg.conversationId,
            created.ticketNumber,
            msg.subject ?? null,
          );
        } else {
          await appendCommentFromEmail(ticketId, msg);
          await writeDedupeEvent(
            ticketId,
            msg.internetMessageId,
            msg.id,
            msg.conversationId,
            ticketNumber,
            msg.subject ?? null,
          );
        }
      } catch (e) {
        console.error("graph-mail-webhook processing error", e);
        await logIngestError({
          stage: "process_notification",
          error: e,
          messageId: n?.resourceData?.id as string | undefined,
        });
      }
    }
  })();

  return ack;
});

export {};

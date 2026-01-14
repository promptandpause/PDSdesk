declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const ADMIN_TOKEN = Deno.env.get("GRAPH_ADMIN_TOKEN") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TENANT_ID = Deno.env.get("MSGRAPH_TENANT_ID") ?? "";
const CLIENT_ID = Deno.env.get("MSGRAPH_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("MSGRAPH_CLIENT_SECRET") ?? "";
const CLIENT_STATE = Deno.env.get("MSGRAPH_WEBHOOK_CLIENT_STATE") ?? "";
const SHARED_MAILBOX =
  Deno.env.get("MSGRAPH_SHARED_MAILBOX") ?? "support@promptandpause.com";
const WEBHOOK_URL = Deno.env.get("MSGRAPH_WEBHOOK_URL") ?? "";

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !CLIENT_STATE || !WEBHOOK_URL) {
  throw new Error(
    "Missing required MSGRAPH_* env vars (including MSGRAPH_WEBHOOK_URL)",
  );
}

async function getGraphToken(): Promise<string> {
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

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (ADMIN_TOKEN) {
    const provided = req.headers.get("x-admin-token") ?? "";
    const authorization = req.headers.get("authorization") ?? "";
    const bearer = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice("bearer ".length)
      : "";
    const matchesServiceRole =
      !!SERVICE_ROLE_KEY && !!bearer && bearer === SERVICE_ROLE_KEY;

    if ((!provided || provided !== ADMIN_TOKEN) && !matchesServiceRole) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const token = await getGraphToken();

  const expiration = new Date(Date.now() + 55 * 60 * 1000).toISOString();

  const body = {
    changeType: "created",
    notificationUrl: WEBHOOK_URL,
    resource: `/users/${SHARED_MAILBOX}/mailFolders('Inbox')/messages`,
    expirationDateTime: expiration,
    clientState: CLIENT_STATE,
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
});

export {};

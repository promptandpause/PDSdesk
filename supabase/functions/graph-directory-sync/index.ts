import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

type GraphUser = {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  accountEnabled?: boolean;
};

type GraphUsersResponse = {
  value: GraphUser[];
  "@odata.nextLink"?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ITSM_AUTOMATION_SECRET = Deno.env.get("ITSM_AUTOMATION_SECRET") ?? "";

const TENANT_ID = Deno.env.get("MSGRAPH_TENANT_ID") ?? "";
const CLIENT_ID = Deno.env.get("MSGRAPH_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("MSGRAPH_CLIENT_SECRET") ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY");
}
if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  throw new Error("Missing required MSGRAPH_* env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-itsm-automation-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isAutomationCall(req: Request): boolean {
  if (!ITSM_AUTOMATION_SECRET) return false;
  const provided = req.headers.get("x-itsm-automation-secret") ?? "";
  return Boolean(provided) && provided === ITSM_AUTOMATION_SECRET;
}

function getTokenIssuer(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const json = JSON.parse(atob(payload)) as { iss?: string };
    return typeof json.iss === "string" ? json.iss : null;
  } catch {
    return null;
  }
}

function getSupabaseUrlHost(): string | null {
  try {
    return new URL(SUPABASE_URL).host;
  } catch {
    return null;
  }
}

async function getCaller(req: Request): Promise<{ userId: string | null; errorMessage: string | null }> {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice("bearer ".length) : "";
  if (!bearer) return { userId: null, errorMessage: "missing authorization header" };

  const { data, error } = await supabaseAuth.auth.getUser(bearer);
  if (error) {
    console.error("auth.getUser failed", error);
    const iss = getTokenIssuer(bearer);
    const host = getSupabaseUrlHost();
    const extra = [
      iss ? `token_iss=${iss}` : null,
      host ? `supabase_url_host=${host}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    return { userId: null, errorMessage: extra ? `${error.message} (${extra})` : error.message };
  }

  return { userId: data.user?.id ?? null, errorMessage: null };
}

async function assertGlobalAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role_key")
    .eq("user_id", userId)
    .eq("role_key", "global_admin")
    .maybeSingle();

  if (error) throw error;
  if (!data?.role_key) {
    throw new Error("forbidden");
  }
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

async function fetchAllUsers(token: string): Promise<GraphUser[]> {
  const select = [
    "id",
    "displayName",
    "givenName",
    "surname",
    "mail",
    "userPrincipalName",
    "jobTitle",
    "department",
    "officeLocation",
    "mobilePhone",
    "businessPhones",
    "accountEnabled",
  ].join(",");

  let url = `https://graph.microsoft.com/v1.0/users?$top=999&$select=${encodeURIComponent(select)}`;
  const users: GraphUser[] = [];

  while (url) {
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Graph users fetch failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as GraphUsersResponse;
    users.push(...(json.value ?? []));
    url = json["@odata.nextLink"] ?? "";
  }

  return users;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const automation = isAutomationCall(req);
    let actorId: string | null = null;

    if (!automation) {
      const caller = await getCaller(req);
      const callerId = caller.userId;
      if (!callerId) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized", details: caller.errorMessage }), {
          status: 401,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      actorId = callerId;
      try {
        await assertGlobalAdmin(callerId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "forbidden") {
          return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "content-type": "application/json" },
          });
        }
        throw e;
      }
    }

    const graphToken = await getGraphToken();
    const graphUsers = await fetchAllUsers(graphToken);

    const nowIso = new Date().toISOString();
    const rows = graphUsers.map((u) => ({
      azure_ad_id: u.id,
      email: (u.mail ?? u.userPrincipalName ?? "").trim() || null,
      full_name: (u.displayName ?? "").trim() || null,
      given_name: (u.givenName ?? "").trim() || null,
      surname: (u.surname ?? "").trim() || null,
      job_title: (u.jobTitle ?? "").trim() || null,
      department: (u.department ?? "").trim() || null,
      office_location: (u.officeLocation ?? "").trim() || null,
      mobile_phone: (u.mobilePhone ?? "").trim() || null,
      business_phone: (u.businessPhones?.[0] ?? "").trim() || null,
      account_enabled: typeof u.accountEnabled === "boolean" ? u.accountEnabled : null,
      raw: u,
      last_synced_at: nowIso,
    }));

    for (const part of chunk(rows, 200)) {
      const { error } = await supabaseAdmin
        .from("directory_users")
        .upsert(part, { onConflict: "azure_ad_id" });
      if (error) throw error;
    }

    const azureIds = rows.map((r) => r.azure_ad_id).filter(Boolean);
    if (azureIds.length > 0) {
      const { data: linkedProfiles, error: linkedProfilesError } = await supabaseAdmin
        .from("profiles")
        .select("id,azure_ad_id")
        .in("azure_ad_id", azureIds);
      if (linkedProfilesError) throw linkedProfilesError;

      const idByAzureAdId = new Map<string, string>();
      for (const p of (linkedProfiles ?? []) as Array<{ id: string; azure_ad_id: string | null }>) {
        if (!p.azure_ad_id) continue;
        idByAzureAdId.set(p.azure_ad_id, p.id);
      }

      const profileUpserts = rows
        .map((r) => {
          const id = idByAzureAdId.get(r.azure_ad_id);
          if (!id) return null;
          return {
            id,
            azure_ad_id: r.azure_ad_id,
            email: r.email,
            full_name: r.full_name,
            department: r.department,
            job_title: r.job_title,
            office_location: r.office_location,
            mobile_phone: r.mobile_phone,
            business_phone: r.business_phone,
            updated_at: nowIso,
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      for (const part of chunk(profileUpserts, 200)) {
        const { error } = await supabaseAdmin.from("profiles").upsert(part, { onConflict: "id" });
        if (error) throw error;
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId,
      action: "graph_directory_sync",
      entity_type: "directory_users",
      entity_id: null,
      metadata: automation ? { count: rows.length, triggered_by: "automation" } : { count: rows.length },
    });

    return new Response(JSON.stringify({ ok: true, count: rows.length }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});

export {};

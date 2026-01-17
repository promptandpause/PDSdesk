import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

type GraphMe = {
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
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getCallerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice("bearer ".length) : "";
  if (!bearer) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(bearer);
  if (error) return null;
  return data.user?.id ?? null;
}

async function fetchMe(providerToken: string): Promise<GraphMe> {
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
  ].join(",");

  const url = `https://graph.microsoft.com/v1.0/me?$select=${encodeURIComponent(select)}`;

  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${providerToken}`,
      "content-type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Graph /me failed: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as GraphMe;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const callerId = await getCallerUserId(req);
    if (!callerId) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    let body: any;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const providerToken = (body?.provider_token ?? "").trim();
    if (!providerToken) {
      return new Response(JSON.stringify({ ok: false, error: "missing provider_token" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const me = await fetchMe(providerToken);

    const email = (me.mail ?? me.userPrincipalName ?? "").trim() || null;
    const fullName = (me.displayName ?? "").trim() || null;

    const nowIso = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: callerId,
          email,
          full_name: fullName,
          azure_ad_id: me.id,
          department: (me.department ?? "").trim() || null,
          job_title: (me.jobTitle ?? "").trim() || null,
          office_location: (me.officeLocation ?? "").trim() || null,
          mobile_phone: (me.mobilePhone ?? "").trim() || null,
          business_phone: (me.businessPhones?.[0] ?? "").trim() || null,
          updated_at: nowIso,
        },
        { onConflict: "id" },
      );

    if (error) throw error;

    // Check if user has any roles assigned
    const { data: existingRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", callerId)
      .limit(1);

    if (rolesError) throw rolesError;

    // If no roles exist, assign the default "requester" role
    let assignedDefaultRole = false;
    if (!existingRoles || existingRoles.length === 0) {
      const { error: insertRoleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: callerId,
          role_key: "requester",
        });

      if (insertRoleError) {
        // Ignore duplicate key errors (role might have been assigned concurrently)
        if (!insertRoleError.message?.includes("duplicate")) {
          console.error("Failed to assign default requester role:", insertRoleError);
        }
      } else {
        assignedDefaultRole = true;
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: callerId,
      action: "graph_user_sync_me",
      entity_type: "profiles",
      entity_id: null,
      metadata: { azure_ad_id: me.id, assigned_default_role: assignedDefaultRole },
    });

    return new Response(JSON.stringify({ ok: true }), {
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

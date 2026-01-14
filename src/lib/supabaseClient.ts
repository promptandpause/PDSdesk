import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getRequiredEnv(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = getRequiredEnv("VITE_SUPABASE_URL");
  const anonKey = getRequiredEnv("VITE_SUPABASE_ANON_KEY");

  client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

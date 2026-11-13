import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createServiceSupabaseClient() {
  const config = getSupabasePublicConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!config || !secretKey) throw new Error("Server-side Supabase configuration is incomplete.");

  return createClient<Database>(config.url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

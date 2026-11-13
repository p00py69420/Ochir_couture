import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database, Product } from "@/lib/database.types";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type CatalogResult =
  | { state: "ready"; products: Product[] }
  | { state: "unconfigured"; products: [] }
  | { state: "error"; products: [] };

export async function getPublicCatalog(): Promise<CatalogResult> {
  const config = getSupabasePublicConfig();
  if (!config) return { state: "unconfigured", products: [] };

  try {
    const supabase = createClient<Database>(config.url, config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase
      .from("products")
      .select("id,name,category,price_mnt,fabric,tags,is_published,created_at,updated_at")
      .eq("is_published", true)
      .order("name")
      .limit(100);

    if (error) return { state: "error", products: [] };
    return { state: "ready", products: data ?? [] };
  } catch {
    return { state: "error", products: [] };
  }
}

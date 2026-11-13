import "server-only";

export function hasSupabaseSecretConfig() {
  return Boolean(process.env.SUPABASE_SECRET_KEY?.trim());
}

export function hasOrderProtectionConfig() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

// Shared environment-variable access for Supabase Edge Functions.
// Reads a list of candidate names in order and returns the first non-empty value.

export function getEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v) return v;
  }
  return undefined;
}

export function requireEnv(...names: string[]): string {
  const v = getEnv(...names);
  if (!v) {
    throw new Error(`Missing required environment variable(s): ${names.join(" | ")}`);
  }
  return v;
}

// Canonical env names (set via `supabase secrets set ...`)
export const PROJECT_URL = () => requireEnv("PROJECT_URL", "SUPABASE_URL");
export const SERVICE_ROLE_KEY = () =>
  requireEnv("SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
export const ANON_KEY = () => requireEnv("ANON_KEY", "SUPABASE_ANON_KEY");
export const MP_ACCESS_TOKEN = () => requireEnv("MERCADOPAGO_ACCESS_TOKEN");

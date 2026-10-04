// Shared CORS helpers for all Supabase Edge Functions.
// Origin is taken from the request when present (credentials are used by some
// functions, so "*" is not safe there); falls back to "*" for public endpoints.

export function getCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-app-url, x-supabase-api-version",
  };
}

export function corsResponse(headers: Record<string, string>): Response {
  return new Response(null, {
    headers: { ...headers, "Access-Control-Max-Age": "86400" },
  });
}

export function jsonHeaders(cors: Record<string, string>): Record<string, string> {
  return { ...cors, "Content-Type": "application/json" };
}

import "server-only";

/**
 * Supabase Cloud Client Helper
 * Configured for project tvyiqyngqehrxrcxqwei
 * Supports both Anon and Service-Role REST operations
 */

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://tvyiqyngqehrxrcxqwei.supabase.co",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
};

/**
 * Executes a REST query against Supabase PostgREST API
 */
export async function querySupabase<T>(
  table: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    query?: Record<string, string>;
    body?: unknown;
    useServiceRole?: boolean;
  } = {}
): Promise<{ data: T | null; error: Error | null; count?: number }> {
  const { method = "GET", query = {}, body, useServiceRole = false } = options;
  const key = useServiceRole ? supabaseConfig.serviceRoleKey : supabaseConfig.anonKey;

  if (!key) {
    return { data: null, error: new Error("Supabase credentials are not configured on the server.") };
  }

  const url = new URL(`${supabaseConfig.url}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.append(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      method,
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Prefer": ["POST", "PATCH", "DELETE"].includes(method) ? "return=representation" : "count=exact",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return { data: null, error: new Error(`Supabase error (${res.status}): ${errText}`) };
    }

    const contentRange = res.headers.get("content-range");
    const count = contentRange ? Number(contentRange.split("/")[1]) : undefined;
    const data = res.status === 204 ? null : ((await res.json()) as T);
    return { data, error: null, ...(Number.isFinite(count) ? { count } : {}) };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

"use client";

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
  }
}

/** Calls an API v1 route and unwraps the `{ success, data, error }` envelope. */
export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      cache: "no-store",
      ...rest,
      ...(json !== undefined ? { method: rest.method ?? "POST", body: JSON.stringify(json), headers: { "content-type": "application/json", ...rest.headers } } : {}),
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "The server could not be reached. Check your connection and try again.", 0);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new ApiError(body?.error?.code ?? "HTTP_ERROR", body?.error?.message ?? `Request failed (${response.status}).`, response.status);
  }
  return body.data as T;
}

/** Downloads a CSV export (the API returns the CSV text inside the JSON envelope). */
export async function downloadCsv(kind: "timetable" | "rooms" | "invigilation", runId?: string) {
  const params = new URLSearchParams({ kind, ...(runId ? { runId } : {}) });
  const data = await api<{ filename: string; csv: string; rows: number }>(`/scheduling/export?${params}`);
  const url = URL.createObjectURL(new Blob([data.csv], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: data.filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return data;
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session has expired. Sign in again to continue.";
    if (error.status === 403) return "Your account does not have administrator access to the scheduling engine.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

// Centralized Cortex Bio API client — JWT, refresh, retries, typed errors.
import { supabase } from "@/integrations/supabase/client";

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "https://api.cortex.bio";
export const DOCS_API_BASE = (import.meta.env.VITE_DOCS_API_URL as string | undefined) ?? API_BASE;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeader(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}

async function refreshSession(): Promise<boolean> {
  const { data, error } = await supabase.auth.refreshSession();
  return !error && !!data.session;
}

export type ApiInit = RequestInit & {
  auth?: boolean;
  _retried?: boolean;
  _retryCount?: number;
  baseUrl?: string;
};

export async function api<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const {
    auth = true,
    headers,
    _retried,
    _retryCount = 0,
    baseUrl = API_BASE,
    ...rest
  } = init;

  const merged: Record<string, string> = {
    "Content-Type": "application/json",
    ...(auth ? await authHeader() : {}),
    ...((headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${baseUrl}${path}`, { ...rest, headers: merged });

  if (res.status === 401 && auth && !_retried && typeof window !== "undefined") {
    const refreshed = await refreshSession();
    if (refreshed) {
      return api<T>(path, { ...init, _retried: true });
    }
  }

  if (res.status >= 500 && _retryCount < 2) {
    await new Promise((r) => setTimeout(r, 400 * (_retryCount + 1)));
    return api<T>(path, { ...init, _retryCount: _retryCount + 1 });
  }

  if (!res.ok) {
    let body: { error?: string; code?: string; message?: string; details?: unknown } | null = null;
    try {
      body = await res.json();
    } catch {
      /* noop */
    }
    throw new ApiError(
      res.status,
      body?.code ?? "request_failed",
      body?.message ?? body?.error ?? res.statusText,
      body?.details,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Returns null on 404 — used when empty data is expected for new users. */
export async function apiOrNull<T>(path: string, init?: ApiInit): Promise<T | null> {
  try {
    return await api<T>(path, init);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

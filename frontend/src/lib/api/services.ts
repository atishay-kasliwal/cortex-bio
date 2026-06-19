import { api, apiOrNull, DOCS_API_BASE } from "./client";

export type ReadinessToday = {
  date: string;
  readiness_score: number;
  contributors: { factor: string; impact: string; direction: string }[];
  daily_features: {
    sleep_duration: number | null;
    avg_hrv: number | null;
    hrv_vs_baseline_pct: number | null;
    resting_hr: number | null;
    steps: number | null;
  };
};

export type ForecastResponse = {
  date: string;
  hourly_forecast: { hour: number; score: number }[];
  best_deep_work_window: { start: string; end: string } | null;
  best_meeting_window: { start: string; end: string } | null;
  recovery_window: { start: string; end: string } | null;
  version: string;
};

export type WindowsToday = {
  date: string;
  hourly_curve: { hour: number; score: number }[];
  peak_window: { start: string; end: string } | null;
  secondary_window: { start: string; end: string } | null;
  crash_window: { start: string; end: string } | null;
  meeting_window: { start: string; end: string } | null;
  recovery_window: { start: string; end: string } | null;
  confidence: number;
};

export type InsightRow = {
  id: string;
  insightType: string;
  title: string;
  description: string | null;
  metricName: string | null;
  impactPct: number | null;
  confidence: number | null;
};

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  tier: string;
  rate_limit: number;
  created_at: string;
  last_used_at: string | null;
  requests: number;
};

export type UsageResponse = {
  days: number;
  total_requests: number;
  forecast_calls: number;
  readiness_calls: number;
  active_keys: number;
  avg_latency_ms: number | null;
  error_rate_pct: number;
  requests_by_day: { date: string; count: number }[];
  by_endpoint: { endpoint: string; status: number; count: number; avg_latency_ms: number | null }[];
  recent_requests: {
    id: string;
    method: string;
    endpoint: string;
    status: number;
    latency_ms: number;
    created_at: string;
  }[];
};

export type ProfileResponse = {
  user_id: string;
  email: string;
  full_name: string | null;
  timezone: string;
  chronotype: { classification?: string; peak_hour?: number } | null;
};

export type UserFreshness = {
  last_sync_at: string | null;
  last_readiness_at: string | null;
  last_forecast_at: string | null;
  has_health_data: boolean;
  has_baseline: boolean;
  has_readiness: boolean;
  has_forecast: boolean;
  connected_providers: number;
  onboarding_step:
    | "connect_provider"
    | "sync_data"
    | "build_baseline"
    | "view_forecast"
    | "complete";
  onboarding_complete: boolean;
};

export type ProviderRow = {
  id: string;
  name: string;
  status: string;
  connected: boolean;
  last_sync_at: string | null;
};

export const cortexApi = {
  provision: () => api<{ provisioned: boolean }>("/api/auth/provision", { method: "POST" }),
  profile: () => api<ProfileResponse>("/api/profile"),
  updateProfile: (body: { full_name?: string; timezone?: string }) =>
    api<ProfileResponse>("/api/profile", { method: "PATCH", body: JSON.stringify(body) }),
  readinessToday: () => apiOrNull<ReadinessToday>("/v1/readiness/today"),
  readinessHistory: (days = 7) =>
    api<{ history: { date: string; readiness_score: number }[] }>(
      `/v1/readiness/history?days=${days}`,
    ),
  forecast: () => apiOrNull<ForecastResponse>("/v1/forecast"),
  windowsToday: () => apiOrNull<WindowsToday>("/v1/windows/today"),
  windowsWeek: () => api<{ windows: WindowsToday[] }>("/v1/windows/week"),
  insights: (limit = 20) => api<{ insights: InsightRow[] }>(`/v1/insights?limit=${limit}`),
  correlations: () =>
    api<{ correlations: unknown[]; summary: Record<string, unknown> }>("/v1/correlations"),
  trends: (days = 7) =>
    api<{
      trends: {
        date: string;
        avg_hrv: number | null;
        resting_hr: number | null;
        readiness_score: number | null;
      }[];
    }>(`/v1/trends?days=${days}`),
  chronotype: () => api<{ chronotype: { classification?: string } }>("/v1/chronotype"),
  listKeys: () => api<{ keys: ApiKeyRow[] }>("/api/keys"),
  createKey: (name: string) =>
    api<{ key: string; id: string; prefix: string }>("/api/keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  revokeKey: (id: string) => api(`/api/keys/${id}`, { method: "DELETE" }),
  usage: (days = 30) => api<UsageResponse>(`/api/keys/usage?days=${days}`),
  providers: () => api<{ providers: ProviderRow[] }>("/api/providers"),
  connectProvider: (id: string) => api(`/api/providers/${id}/connect`, { method: "POST" }),
  disconnectProvider: (id: string) => api(`/api/providers/${id}/disconnect`, { method: "POST" }),
  freshness: () => api<UserFreshness>("/api/meta/freshness"),
  openApiSpec: () =>
    api<{
      info: { title: string; version: string; description?: string };
      paths: Record<string, Record<string, { summary?: string; description?: string }>>;
    }>("/openapi.json", { auth: false, baseUrl: DOCS_API_BASE }),
};

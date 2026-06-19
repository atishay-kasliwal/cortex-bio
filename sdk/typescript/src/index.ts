export type CortexBioConfig = {
  apiKey: string;
  baseUrl?: string;
};

export type ReadinessToday = {
  api_version: string;
  date: string;
  readiness_score: number;
  contributors: Array<{
    factor: string;
    impact: string;
    direction: 'positive' | 'negative' | 'neutral';
  }>;
  engine_version: string;
};

export type ForecastResponse = {
  api_version: string;
  date: string;
  hourly_forecast: Array<{ hour: number; score: number }>;
  best_deep_work_window: { start: string; end: string } | null;
  best_meeting_window: { start: string; end: string } | null;
  recovery_window: { start: string; end: string } | null;
  daily_prediction: Record<string, unknown> | null;
  version: string;
};

export class CortexBioError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = 'CortexBioError';
  }
}

export class CortexBio {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CortexBioConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.cortex.bio').replace(/\/$/, '');
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    const text = await res.text();
    if (!res.ok) {
      throw new CortexBioError(
        `Cortex Bio API ${res.status}: ${text}`,
        res.status,
        text,
      );
    }

    return JSON.parse(text) as T;
  }

  readonly readiness = {
    today: () => this.request<ReadinessToday>('/v1/readiness/today'),
    history: (days = 30) =>
      this.request<{ api_version: string; history: unknown[] }>(
        `/v1/readiness/history?days=${days}`,
      ),
    baselines: () => this.request<Record<string, unknown>>('/v1/baselines'),
  };

  readonly chronotype = {
    get: () => this.request<Record<string, unknown>>('/v1/chronotype'),
  };

  readonly windows = {
    today: () => this.request<Record<string, unknown>>('/v1/windows/today'),
    week: () => this.request<Record<string, unknown>>('/v1/windows/week'),
  };

  readonly forecast = {
    today: () => this.request<ForecastResponse>('/v1/forecast'),
  };

  readonly analytics = {
    insights: (limit = 20) =>
      this.request<Record<string, unknown>>(`/v1/insights?limit=${limit}`),
    correlations: () => this.request<Record<string, unknown>>('/v1/correlations'),
    trends: (days = 30) =>
      this.request<Record<string, unknown>>(`/v1/trends?days=${days}`),
  };

  readonly predictions = {
    tomorrow: () => this.request<Record<string, unknown>>('/v1/predictions/tomorrow'),
    week: () => this.request<Record<string, unknown>>('/v1/predictions/week'),
  };

  readonly models = {
    status: () => this.request<Record<string, unknown>>('/v1/models/status'),
  };
}

export default CortexBio;

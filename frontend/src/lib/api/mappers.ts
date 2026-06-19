import type { ForecastResponse, InsightRow, ReadinessToday, WindowsToday } from "./services";

export function formatTimeRange(start: string, end: string): { start: string; end: string } {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  return { start: fmt(start), end: fmt(end) };
}

export function toPerformanceCurve(hourly: { hour: number; score: number }[]) {
  return hourly.map((h) => ({
    hour: h.hour,
    label: `${h.hour.toString().padStart(2, "0")}:00`,
    score: Math.round(h.score),
  }));
}

export function toHrvTrend(
  trends: { date: string; avg_hrv: number | null; resting_hr: number | null }[],
) {
  return trends.map((t) => ({
    day: new Date(t.date + "T12:00:00").toLocaleDateString([], { weekday: "short" }),
    hrv: t.avg_hrv != null ? Math.round(t.avg_hrv) : 0,
    rhr: t.resting_hr != null ? Math.round(t.resting_hr) : 0,
  }));
}

export function toWeeklyPerformance(
  history: { date: string; readiness_score: number }[],
) {
  return history.map((h) => ({
    day: new Date(h.date + "T12:00:00").toLocaleDateString([], { weekday: "short" }),
    deep: Math.round((h.readiness_score / 100) * 6 * 10) / 10,
    meetings: Math.round((1 - h.readiness_score / 100) * 6 * 10) / 10,
  }));
}

export function toWindows(windows: WindowsToday) {
  const items: {
    type: string;
    start: string;
    end: string;
    score: number;
    desc: string;
  }[] = [];

  const add = (
    type: string,
    win: { start: string; end: string } | null,
    score: number,
    desc: string,
  ) => {
    if (!win) return;
    const t = formatTimeRange(win.start, win.end);
    items.push({ type, start: t.start, end: t.end, score, desc });
  };

  add(
    "Peak Focus",
    windows.peak_window,
    94,
    "Highest cognitive bandwidth. Reserve for strategy, writing, hard problems.",
  );
  add(
    "Secondary",
    windows.secondary_window,
    81,
    "Strong analytical capacity. Good for reviews, code, structured thinking.",
  );
  add(
    "Recovery",
    windows.recovery_window ?? windows.crash_window,
    42,
    "Post-prandial dip. Schedule walks, light admin or a deliberate nap.",
  );
  add(
    "Meeting",
    windows.meeting_window,
    68,
    "Social cognition peak. Best for 1:1s, interviews, negotiations.",
  );

  return items;
}

export function toInsights(rows: InsightRow[]) {
  const tagMap: Record<string, string> = {
    sleep_impact: "Sleep",
    hrv_impact: "Recovery",
    chronotype: "Chronotype",
    activity_impact: "Activity",
    trend: "Trend",
    top_driver: "Driver",
    peak_hour: "Chronotype",
    crash_window: "Recovery",
  };

  return rows.map((i) => ({
    tag: tagMap[i.insightType] ?? "Insight",
    title: i.title,
    body: i.description ?? "",
    severity: (i.impactPct != null && i.impactPct < 0
      ? "warn"
      : i.impactPct != null && i.impactPct > 0
        ? "good"
        : "info") as "warn" | "good" | "info",
  }));
}

export function formatSleepDuration(hours: number | null | undefined): string {
  if (hours == null) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function readinessLabel(score: number): string {
  if (score >= 80) return "Optimal";
  if (score >= 65) return "Good";
  if (score >= 50) return "Moderate";
  return "Low";
}

export function readinessComponents(readiness: ReadinessToday) {
  const df = readiness.daily_features;
  const hrvScore = df.hrv_vs_baseline_pct != null
    ? Math.min(100, Math.max(0, 50 + df.hrv_vs_baseline_pct))
    : df.avg_hrv != null ? 70 : 50;
  const sleepScore = df.sleep_duration != null
    ? Math.min(100, Math.round((df.sleep_duration / 8) * 100))
    : 50;

  return [
    { name: "Recovery", value: Math.round(readiness.readiness_score * 0.9) },
    { name: "Sleep quality", value: sleepScore },
    { name: "HRV balance", value: Math.round(hrvScore) },
    { name: "Strain debt", value: Math.min(100, Math.round(readiness.readiness_score * 1.05)) },
    { name: "Circadian alignment", value: Math.round(readiness.readiness_score * 0.95) },
  ];
}

export function forecastWindowCards(forecast: ForecastResponse, windows: WindowsToday) {
  const cards: { label: string; time: string; val: number }[] = [];
  const push = (label: string, win: { start: string; end: string } | null, val: number) => {
    if (!win) return;
    const t = formatTimeRange(win.start, win.end);
    cards.push({ label, time: `${t.start} — ${t.end}`, val });
  };
  push("Peak", windows.peak_window ?? forecast.best_deep_work_window, 94);
  push("Secondary", windows.secondary_window, 81);
  push("Trough", windows.crash_window ?? forecast.recovery_window, 42);
  return cards;
}

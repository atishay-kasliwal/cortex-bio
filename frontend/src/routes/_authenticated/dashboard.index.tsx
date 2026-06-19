import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Moon, Zap } from "lucide-react";
import { useOverviewData } from "@/lib/api/hooks";
import { OnboardingSteps } from "@/components/dashboard/onboarding-steps";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import {
  formatSleepDuration,
  formatTimeRange,
  toHrvTrend,
  toPerformanceCurve,
  toWeeklyPerformance,
} from "@/lib/api/mappers";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — Atriveo Bio" }] }),
  component: Overview,
});

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function Overview() {
  const { profile, readiness, forecast, windows, trends, history, freshness, isLoading, isError, refetch } =
    useOverviewData();

  const name = profile.data?.full_name?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const score = readiness.data?.readiness_score;
  const peak = windows.data?.peak_window;
  const peakLabel = peak ? formatTimeRange(peak.start, peak.end).start : "—";

  const performanceCurve = forecast.data?.hourly_forecast
    ? toPerformanceCurve(forecast.data.hourly_forecast)
    : windows.data?.hourly_curve
      ? toPerformanceCurve(windows.data.hourly_curve)
      : [];

  const hrvTrend = trends.data ? toHrvTrend(trends.data) : [];
  const weeklyPerformance = history.data?.history
    ? toWeeklyPerformance(history.data.history)
    : [];

  const sleepHours = readiness.data?.daily_features.sleep_duration;
  const showOnboarding = freshness.data && !freshness.data.onboarding_complete;

  if (isLoading && !freshness.data) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" description="We couldn't load your biometric data." />
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Connect a wearable provider in Settings, then sync data.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning, ${name}`}
        description={`${today}${peak ? ` — peak window starts at ${peakLabel}.` : ""}`}
        actions={<Button className="bg-foreground text-background hover:bg-foreground/90" onClick={() => refetch()}>Sync now</Button>}
      />

      {showOnboarding && freshness.data ? <OnboardingSteps freshness={freshness.data} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Readiness" value={isLoading ? "—" : String(Math.round(score ?? 0))} hint="Cognitive readiness · today" />
        <StatCard label="Peak Window" value={isLoading ? "—" : peakLabel} hint="Highest forecasted focus" />
        <StatCard label="Recovery" value={isLoading ? "—" : `${Math.round(score ?? 0)}%`} hint="vs baseline" />
        <StatCard label="Sleep" value={isLoading ? "—" : formatSleepDuration(sleepHours)} hint="Last night" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium tracking-tight">Performance forecast</h3>
              <p className="text-xs text-muted-foreground">Hourly cognitive readiness, next 24 hours</p>
            </div>
            <Zap className="h-4 w-4 text-[var(--brand)]" />
          </div>
          <div className="h-[260px]">
            {performanceCurve.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No forecast data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceCurve} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} interval={3} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="score" stroke="var(--brand)" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium tracking-tight">Sleep summary</h3>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <SleepRow label="Total" value={formatSleepDuration(sleepHours)} pct={sleepHours ? Math.min(100, Math.round((sleepHours / 8) * 100)) : 0} />
            <SleepRow label="Deep" value="—" pct={0} subtle />
            <SleepRow label="REM" value="—" pct={0} subtle />
            <SleepRow label="Awake" value="—" pct={0} subtle />
          </div>
          <div className="mt-5 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {readiness.data?.contributors[0]?.factor ?? "Sync wearable data to see sleep insights."}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-medium tracking-tight">HRV trend</h3>
          <div className="h-[220px]">
            {hrvTrend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No HRV history</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hrvTrend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="hrv" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="rhr" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-medium tracking-tight">Weekly performance</h3>
          <div className="h-[220px]">
            {weeklyPerformance.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No weekly history</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyPerformance} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="deep" fill="var(--brand)" radius={[4,4,0,0]} />
                  <Bar dataKey="meetings" fill="var(--muted-foreground)" radius={[4,4,0,0]} opacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SleepRow({ label, value, pct, subtle }: { label: string; value: string; pct: number; subtle?: boolean }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${subtle ? "bg-muted-foreground/50" : "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)]"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

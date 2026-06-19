import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { useReadinessToday } from "@/lib/api/hooks";
import { readinessComponents, readinessLabel } from "@/lib/api/mappers";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export const Route = createFileRoute("/_authenticated/dashboard/readiness")({
  head: () => ({ meta: [{ title: "Readiness — Atriveo Bio" }] }),
  component: ReadinessPage,
});

function ReadinessPage() {
  const { data, isLoading, isError, refetch } = useReadinessToday();
  const score = data ? Math.round(data.readiness_score) : 0;
  const components = data ? readinessComponents(data) : [];
  const df = data?.daily_features;

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cognitive readiness" description="Unable to load readiness." />
        <button type="button" className="text-sm underline" onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cognitive readiness" description="A calibrated estimate of your capacity for high-stakes cognitive work right now." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="rounded-xl border border-border bg-card p-6">
          <ReadinessRing score={isLoading ? 0 : score} />
          <div className="mt-6 space-y-2 text-center">
            <div className="text-sm font-medium text-[oklch(0.7_0.17_160)]">{isLoading ? "—" : readinessLabel(score)}</div>
            <p className="text-xs text-muted-foreground">
              {data?.contributors[0]?.factor ?? "Connect a wearable and sync data to compute readiness."}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="HRV (rMSSD)" value={df?.avg_hrv != null ? `${Math.round(df.avg_hrv)} ms` : "—"} />
            <StatCard label="RHR" value={df?.resting_hr != null ? `${Math.round(df.resting_hr)} bpm` : "—"} />
            <StatCard label="Steps" value={df?.steps != null ? String(Math.round(df.steps)) : "—"} hint="yesterday" />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-medium tracking-tight">Score components</h3>
            <p className="text-xs text-muted-foreground">How each signal contributes to today's readiness.</p>
            <div className="mt-5 space-y-4">
              {components.length === 0 ? (
                <p className="text-sm text-muted-foreground">No component data yet.</p>
              ) : (
                components.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="font-mono text-muted-foreground">{c.value}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)]" style={{ width: `${c.value}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadinessRing({ score }: { score: number }) {
  const r = 80;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} stroke="var(--border)" strokeWidth="14" fill="none" />
        <defs>
          <linearGradient id="ringG" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--brand-glow)" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={r} stroke="url(#ringG)" strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-semibold tracking-tight">{score || "—"}</div>
        <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">readiness</div>
      </div>
    </div>
  );
}

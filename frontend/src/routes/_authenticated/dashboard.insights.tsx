import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/page-header";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useInsights } from "@/lib/api/hooks";
import { toInsights } from "@/lib/api/mappers";

export const Route = createFileRoute("/_authenticated/dashboard/insights")({
  head: () => ({ meta: [{ title: "Insights — Atriveo Bio" }] }),
  component: InsightsPage,
});

const icons = {
  warn: { Icon: AlertTriangle, color: "text-[oklch(0.78_0.16_80)]" },
  good: { Icon: CheckCircle2, color: "text-[oklch(0.7_0.17_160)]" },
  info: { Icon: Info, color: "text-[var(--brand)]" },
};

function InsightsPage() {
  const { data, isLoading, isError, refetch } = useInsights();
  const insights = data ? toInsights(data) : [];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Insights" description="Unable to load insights." />
        <button type="button" className="text-sm underline" onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" description="Patterns we've detected in your biometric data over the last 14 days." />
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading insights…</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights yet. More data unlocks pattern detection.</p>
        ) : (
          insights.map((i) => {
            const { Icon, color } = icons[i.severity];
            return (
              <div key={i.title} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{i.tag}</div>
                  <h3 className="font-medium tracking-tight">{i.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{i.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

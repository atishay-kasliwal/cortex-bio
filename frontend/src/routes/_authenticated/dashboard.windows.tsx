import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/page-header";
import { useWindowsToday } from "@/lib/api/hooks";
import { toWindows } from "@/lib/api/mappers";

export const Route = createFileRoute("/_authenticated/dashboard/windows")({
  head: () => ({ meta: [{ title: "Windows — Atriveo Bio" }] }),
  component: WindowsPage,
});

function WindowsPage() {
  const { data, isLoading, isError, refetch } = useWindowsToday();
  const windows = data ? toWindows(data) : [];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Work windows" description="Unable to load windows." />
        <button type="button" className="text-sm underline" onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Work windows" description="Personalized blocks of time tuned to your biology, today." />
      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading windows…</p>
        ) : windows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No windows computed yet. Sync wearable data first.</p>
        ) : (
          windows.map((w) => (
            <div key={w.type} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{w.type} Window</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">{w.start} <span className="text-muted-foreground">→</span> {w.end}</div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/40 font-mono text-sm font-medium">{w.score}</div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{w.desc}</p>
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)]" style={{ width: `${w.score}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

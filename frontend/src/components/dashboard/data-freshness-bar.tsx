import type { UserFreshness } from "@/lib/api/services";

function fmt(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString();
}

export function DataFreshnessBar({ freshness }: { freshness: UserFreshness }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
      <span><span className="text-foreground/80">Last sync</span> · {fmt(freshness.last_sync_at)}</span>
      <span><span className="text-foreground/80">Last readiness</span> · {fmt(freshness.last_readiness_at)}</span>
      <span><span className="text-foreground/80">Last forecast</span> · {fmt(freshness.last_forecast_at)}</span>
    </div>
  );
}

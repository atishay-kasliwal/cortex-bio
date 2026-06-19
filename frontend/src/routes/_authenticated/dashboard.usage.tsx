import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { useApiKeys, useUsage } from "@/lib/api/hooks";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export const Route = createFileRoute("/_authenticated/dashboard/usage")({
  head: () => ({ meta: [{ title: "Usage — Atriveo Bio" }] }),
  component: UsagePage,
});

function UsagePage() {
  const { data, isLoading, isError, refetch } = useUsage(30);
  const keys = useApiKeys();

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="API usage" description="Unable to load usage." />
        <button type="button" className="text-sm underline" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const chartData = data?.requests_by_day ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="API usage"
        description="Requests, latency, and endpoint breakdown for your account."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="API Requests" value={(data?.total_requests ?? 0).toLocaleString()} />
        <StatCard label="Forecast Calls" value={String(data?.forecast_calls ?? 0)} />
        <StatCard label="Readiness Calls" value={String(data?.readiness_calls ?? 0)} />
        <StatCard label="Active Keys" value={String(data?.active_keys ?? keys.data?.length ?? 0)} />
        <StatCard
          label="Error rate"
          value={`${data?.error_rate_pct ?? 0}%`}
          hint={data?.avg_latency_ms != null ? `Avg ${data.avg_latency_ms} ms` : undefined}
        />
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-medium tracking-tight">Requests over time</h3>
        <div className="h-[260px]">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No API traffic yet — dashboard calls are logged automatically.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <h3 className="border-b border-border px-5 py-3 text-sm font-medium">Endpoint breakdown</h3>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Endpoint</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Count</th>
              <th className="px-5 py-3 text-right">Avg latency</th>
            </tr>
          </thead>
          <tbody>
            {(data?.by_endpoint ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-muted-foreground">
                  No endpoint data yet.
                </td>
              </tr>
            ) : (
              (data?.by_endpoint ?? []).slice(0, 15).map((row, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-5 py-3 font-mono text-xs">{row.endpoint}</td>
                  <td className="px-5 py-3">{row.status}</td>
                  <td className="px-5 py-3 text-right font-mono">{row.count}</td>
                  <td className="px-5 py-3 text-right font-mono">{row.avg_latency_ms ?? "—"} ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <h3 className="border-b border-border px-5 py-3 text-sm font-medium">Request history</h3>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">Method</th>
              <th className="px-5 py-3">Endpoint</th>
              <th className="px-5 py-3 text-right">Status</th>
              <th className="px-5 py-3 text-right">Latency</th>
            </tr>
          </thead>
          <tbody>
            {(data?.recent_requests ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-muted-foreground">
                  No recent requests.
                </td>
              </tr>
            ) : (
              (data?.recent_requests ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{r.method}</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.endpoint}</td>
                  <td className="px-5 py-3 text-right">{r.status}</td>
                  <td className="px-5 py-3 text-right font-mono">{r.latency_ms} ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

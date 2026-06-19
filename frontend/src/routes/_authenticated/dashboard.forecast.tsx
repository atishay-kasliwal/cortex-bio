import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/page-header";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useForecast, useWindowsToday } from "@/lib/api/hooks";
import { forecastWindowCards, toPerformanceCurve } from "@/lib/api/mappers";

export const Route = createFileRoute("/_authenticated/dashboard/forecast")({
  head: () => ({ meta: [{ title: "Forecast — Atriveo Bio" }] }),
  component: ForecastPage,
});

function ForecastPage() {
  const forecast = useForecast();
  const windows = useWindowsToday();

  const performanceCurve = forecast.data?.hourly_forecast
    ? toPerformanceCurve(forecast.data.hourly_forecast)
    : [];

  const cards =
    forecast.data && windows.data
      ? forecastWindowCards(forecast.data, windows.data)
      : [];

  if (forecast.isError || windows.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="24-hour forecast" description="Unable to load forecast." />
        <button type="button" className="text-sm underline" onClick={() => { forecast.refetch(); windows.refetch(); }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="24-hour forecast" description="Hourly cognitive performance for the next 24 hours, with detected work windows." />
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="h-[420px]">
          {performanceCurve.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No forecast data yet. Connect a wearable and sync.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceCurve} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="fc" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <ReferenceArea x1="09:00" x2="12:00" fill="var(--brand)" fillOpacity={0.06} />
                <ReferenceArea x1="15:00" x2="17:00" fill="var(--brand)" fillOpacity={0.04} />
                <Area type="monotone" dataKey="score" stroke="var(--brand)" strokeWidth={2.2} fill="url(#fc)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(cards.length ? cards : [{ label: "Peak", time: "—", val: 0 }, { label: "Secondary", time: "—", val: 0 }, { label: "Trough", time: "—", val: 0 }]).map((w) => (
          <div key={w.label} className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{w.label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{w.time}</div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">score {w.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

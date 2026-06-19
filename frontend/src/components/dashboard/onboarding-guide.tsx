import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import type { UserFreshness } from "@/lib/api/services";

const STEPS = [
  {
    key: "connect_provider",
    title: "Connect Apple Health",
    desc: "Link your wearable in Settings.",
    to: "/dashboard/settings" as const,
  },
  {
    key: "sync_data",
    title: "Sync your first dataset",
    desc: "Use the Cortex Bio iOS app or provider integration to import sleep, HRV, and activity.",
    to: "/dashboard/settings" as const,
  },
  {
    key: "build_baseline",
    title: "Build your baseline",
    desc: "We need ~7 days of data before forecasts are reliable. Keep syncing daily.",
    to: "/dashboard/readiness" as const,
  },
  {
    key: "view_forecast",
    title: "View your first forecast",
    desc: "Once baselines are ready, your 24-hour cognitive forecast unlocks.",
    to: "/dashboard/forecast" as const,
  },
] as const;

export function OnboardingGuide({ freshness }: { freshness: UserFreshness }) {
  if (freshness.onboarding_complete) return null;

  const currentIdx = STEPS.findIndex((s) => s.key === freshness.onboarding_step);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-medium tracking-tight">Get started with Atriveo Bio</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Follow these steps to unlock readiness scores, work windows, and forecasts.
      </p>
      <ol className="mt-5 space-y-4">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          const Icon = done ? CheckCircle2 : Circle;
          return (
            <li key={step.key} className="flex gap-3">
              <Icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${done ? "text-[oklch(0.7_0.17_160)]" : active ? "text-[var(--brand)]" : "text-muted-foreground"}`}
              />
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {step.title}
                </div>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
                {active ? (
                  <Link to={step.to} className="mt-2 inline-block text-xs font-medium underline">
                    Continue →
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

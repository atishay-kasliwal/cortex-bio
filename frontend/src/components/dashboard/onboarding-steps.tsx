import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import type { UserFreshness } from "@/lib/api/services";

const STEPS = [
  { key: "connect_provider", label: "Connect wearable provider", href: "/dashboard/settings" },
  { key: "sync_data", label: "Sync health data", href: "/dashboard/settings" },
  { key: "build_baseline", label: "Generate baseline", href: "/dashboard/readiness" },
  { key: "view_forecast", label: "Receive first forecast", href: "/dashboard/forecast" },
] as const;

export function OnboardingSteps({ freshness }: { freshness: UserFreshness }) {
  if (freshness.onboarding_complete) return null;

  const currentIdx = STEPS.findIndex((s) => s.key === freshness.onboarding_step);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-medium tracking-tight">Get started with Atriveo Bio</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Complete these steps to unlock readiness scores, forecasts, and insights.
      </p>
      <ol className="mt-5 space-y-3">
        {STEPS.map((step, i) => {
          const done = i < currentIdx || freshness.onboarding_step === "complete";
          const active = i === currentIdx;
          const Icon = done ? CheckCircle2 : Circle;
          return (
            <li key={step.key} className="flex items-center gap-3 text-sm">
              <Icon
                className={`h-4 w-4 shrink-0 ${done ? "text-[oklch(0.7_0.17_160)]" : active ? "text-[var(--brand)]" : "text-muted-foreground"}`}
              />
              {active ? (
                <Link to={step.href} className="font-medium underline-offset-2 hover:underline">
                  {step.label}
                </Link>
              ) : (
                <span
                  className={done ? "text-muted-foreground line-through" : "text-muted-foreground"}
                >
                  {step.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

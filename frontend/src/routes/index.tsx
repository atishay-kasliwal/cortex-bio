import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Brain, LineChart, Sun, Activity, BarChart3, Code2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { features, steps, wearables } from "@/lib/marketing-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atriveo Bio — Know when you'll perform at your best" },
      { name: "description", content: "Transform wearable data into cognitive forecasts, deep work windows, and performance insights." },
      { property: "og:title", content: "Atriveo Bio" },
      { property: "og:description", content: "Wearable intelligence for peak human performance." },
    ],
  }),
  component: Index,
});

const iconMap = { Brain, LineChart, Sun, Activity, BarChart3, Code2 } as const;

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <Trust />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-[600px] bg-radial-fade" />
      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-28 md:pt-32 md:pb-36">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <a href="#features" className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur transition hover:text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]" />
            Cortex telemetry is now live
            <ArrowRight className="h-3 w-3" />
          </a>
          <h1 className="text-balance text-5xl font-semibold tracking-[-0.04em] md:text-7xl">
            <span className="text-gradient">Know when you'll<br />perform at your best.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
            Transform wearable data into cognitive forecasts, deep work windows, and performance insights.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 h-11 px-6">
              <Link to="/auth/signup">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-6 bg-background/50 backdrop-blur">
              <Link to="/docs">View API Docs</Link>
            </Button>
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto mt-20 max-w-5xl">
      <div className="absolute -inset-x-12 -inset-y-8 -z-10 rounded-[2rem] bg-gradient-to-b from-[var(--brand)]/30 via-[var(--brand-glow)]/10 to-transparent blur-3xl opacity-60" />
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl shadow-[var(--brand)]/10">
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          </div>
          <span className="ml-3 font-mono text-xs text-muted-foreground">bio.atriveo.com/dashboard</span>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-3">
          <PreviewStat label="Readiness" value="86" delta="+4" hint="Today" />
          <PreviewStat label="Peak Window" value="09:30" delta="2h 15m" hint="Starts in 47 min" />
          <PreviewStat label="Recovery" value="72%" delta="+9%" hint="vs 7-day avg" />
          <div className="col-span-3 bg-card p-6">
            <PreviewCurve />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value, delta, hint }: { label: string; value: string; delta: string; hint: string }) {
  return (
    <div className="bg-card p-6">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        <span className="text-xs font-medium text-[oklch(0.7_0.17_160)]">{delta}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function PreviewCurve() {
  const points = Array.from({ length: 48 }, (_, i) => {
    const x = i / 47;
    const morning = Math.exp(-((x - 0.42) ** 2) * 40) * 0.85;
    const afternoon = Math.exp(-((x - 0.68) ** 2) * 30) * 0.65;
    return { x, y: Math.max(morning, afternoon, 0.25) };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${(p.x * 100).toFixed(2)},${(100 - p.y * 90).toFixed(2)}`).join(" ");
  const area = `${path} L100,100 L0,100 Z`;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">24h Performance Forecast</span>
        <span className="font-mono">today</span>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full">
        <defs>
          <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#curveFill)" />
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
}

function Trust() {
  return (
    <section className="border-y border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Unifies telemetry from
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {wearables.map((w) => (
            <span key={w.id} className="text-base font-medium text-muted-foreground/80 transition hover:text-foreground">
              {w.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--brand)]">Platform</p>
        <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Biometric intelligence, end to end.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Six tightly-integrated layers that turn passive sensor data into decisions you act on every morning.
        </p>
      </div>
      <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = iconMap[f.icon as keyof typeof iconMap];
          return (
            <div key={f.title} className="group relative bg-card p-7 transition hover:bg-accent/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-[var(--brand)] transition group-hover:glow-ring">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-medium tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--brand)]">Pipeline</p>
          <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            From raw signal to scheduled action.
          </h2>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-xl border border-border bg-card p-6">
              <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
              <h3 className="mt-3 text-base font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="absolute -right-3.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground/60 md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Individual", price: "$0", desc: "For one athlete-operator. All core forecasts.", features: ["Connect 2 wearables", "Daily readiness score", "Peak window forecasts", "Community support"], cta: "Start free" },
    { name: "Pro", price: "$24", suffix: "/mo", desc: "Full chronotype + deep work intelligence.", features: ["Unlimited wearables", "Cognitive readiness API", "Chronotype reports", "Webhooks & integrations", "Priority support"], cta: "Start Pro trial", featured: true },
    { name: "Team", price: "Custom", desc: "For high-performance teams and labs.", features: ["SSO + audit logs", "Cohort analytics", "Custom models", "SLA & dedicated CSM"], cta: "Talk to us" },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--brand)]">Pricing</p>
        <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">Built for individuals. Priced for teams.</h2>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className={`relative rounded-2xl border bg-card p-7 ${t.featured ? "border-[var(--brand)]/50 glow-ring" : "border-border"}`}>
            {t.featured && <span className="absolute -top-2.5 left-7 rounded-full bg-[var(--brand)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--brand-foreground)]">Popular</span>}
            <h3 className="text-sm font-medium text-muted-foreground">{t.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
              {t.suffix && <span className="text-sm text-muted-foreground">{t.suffix}</span>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 text-[var(--brand)]" /> <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button asChild className={`mt-7 w-full ${t.featured ? "bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90" : "bg-foreground text-background hover:bg-foreground/90"}`}>
              <Link to="/auth/signup">{t.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-border/60">
      <div className="absolute inset-0 bg-radial-fade opacity-80" />
      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Tomorrow's peak window is already forming.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Connect your wearables in 90 seconds. We'll have your first forecast ready by morning.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 h-11 px-6">
            <Link to="/auth/signup">Get Started <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 px-6">
            <Link to="/docs">View API Docs</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

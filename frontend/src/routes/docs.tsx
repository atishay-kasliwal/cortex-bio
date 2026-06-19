import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Badge } from "@/components/ui/badge";
import { cortexApi } from "@/lib/api/services";

const DOCS_API = import.meta.env.VITE_DOCS_API_URL ?? "https://api.cortex.bio";

export const Route = createFileRoute("/docs")({
  head: () => ({ meta: [{ title: "Documentation — Atriveo Bio API" }] }),
  component: DocsPage,
});

function DocsPage() {
  const spec = useQuery({
    queryKey: ["openapi"],
    queryFn: () => cortexApi.openApiSpec(),
  });

  const paths = spec.data?.paths ? Object.entries(spec.data.paths) : [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">API Reference</p>
            {["intro", "auth", "quickstart", "explorer", "errors", "limits"].map((s) => (
              <a key={s} href={`#${s}`} className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground">
                {s === "intro" ? "Introduction" : s === "auth" ? "Authentication" : s === "quickstart" ? "Quick Start" : s === "explorer" ? "API Explorer" : s === "errors" ? "Error Codes" : "Rate Limits"}
              </a>
            ))}
          </div>
        </aside>
        <main className="space-y-16">
          <header>
            <Badge variant="outline" className="font-mono text-[10px]">v1 · public beta</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Atriveo Bio API</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              REST API for cognitive readiness, performance forecasts, chronotype, and recovery telemetry from any supported wearable.
            </p>
          </header>

          <DocBlock id="intro" title="Introduction">
            <p>Base URL: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{DOCS_API}/v1</code></p>
            <p>OpenAPI: <a href={`${DOCS_API}/openapi.json`} className="underline">{DOCS_API}/openapi.json</a> · Interactive docs: <a href={`${DOCS_API}/docs`} className="underline">{DOCS_API}/docs</a></p>
          </DocBlock>

          <DocBlock id="auth" title="Authentication">
            <p>Dashboard users: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer &lt;supabase_jwt&gt;</code></p>
            <p>External developers: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer cb_live_…</code> or <code className="font-mono text-xs">cb_test_…</code></p>
            <CodeBlock>{`curl ${DOCS_API}/v1/readiness/today \\\n  -H "Authorization: Bearer cb_live_YOUR_KEY"`}</CodeBlock>
          </DocBlock>

          <DocBlock id="quickstart" title="Quick Start">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Create an account at bio.atriveo.com</li>
              <li>API keys are issued automatically — manage them in the dashboard</li>
              <li>Call <code className="font-mono text-xs">GET /v1/readiness/today</code> with your key or session JWT</li>
            </ol>
            <p className="mt-4">SDKs: <code className="font-mono text-xs">@cortexbio/sdk</code> (npm) and <code className="font-mono text-xs">cortexbio</code> (PyPI)</p>
          </DocBlock>

          <DocBlock id="explorer" title="API Explorer">
            {spec.isLoading ? (
              <p>Loading endpoints from OpenAPI…</p>
            ) : spec.isError ? (
              <p>Could not load OpenAPI spec. <button type="button" className="underline" onClick={() => spec.refetch()}>Retry</button></p>
            ) : (
              <div className="space-y-2">
                {paths.slice(0, 24).map(([path, methods]) => (
                  <div key={path} className="rounded-lg border border-border p-3 font-mono text-xs">
                    <div className="text-foreground">{path}</div>
                    <div className="mt-1 text-muted-foreground">
                      {Object.entries(methods).map(([method, meta]) => (
                        <span key={method} className="mr-3 uppercase">{method}: {meta.summary ?? meta.description ?? "—"}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DocBlock>

          <DocBlock id="limits" title="Rate Limits">
            <p>Free tier: 60 requests/minute per API key. JWT dashboard sessions: 120 requests/minute per user.</p>
          </DocBlock>

          <DocBlock id="errors" title="Error Codes">
            <p><code className="font-mono">401</code> Unauthorized · <code className="font-mono">404</code> No data · <code className="font-mono">429</code> Rate limited · <code className="font-mono">501</code> Provider not implemented</p>
          </DocBlock>

          <p className="text-sm text-muted-foreground">
            Need an API key? <Link to="/dashboard/api-keys" className="text-foreground underline">Open the dashboard</Link>.
          </p>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}

function DocBlock({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4 scroll-mt-20">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground">
      <code>{children}</code>
    </pre>
  );
}

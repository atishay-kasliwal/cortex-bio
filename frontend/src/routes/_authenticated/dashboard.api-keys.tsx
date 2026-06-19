import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Plus } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { toast } from "sonner";
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useUsage } from "@/lib/api/hooks";

export const Route = createFileRoute("/_authenticated/dashboard/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — Atriveo Bio" }] }),
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const { data: keys = [], isLoading, refetch } = useApiKeys();
  const usage = useUsage(30);
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const [revealed, setRevealed] = useState<string | null>(null);

  const onCreate = async () => {
    try {
      const res = await createKey.mutateAsync("Production");
      setRevealed(res.key);
      toast.success("API key created — copy it now, it won't be shown again.");
    } catch {
      toast.error("Failed to create API key");
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Manage credentials for the Atriveo Bio API."
        actions={
          <Button
            onClick={onCreate}
            disabled={createKey.isPending}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" /> Create API Key
          </Button>
        }
      />
      {revealed ? (
        <div className="rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs">
          New key (shown once): <span className="text-foreground">{revealed}</span>
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => copy(revealed)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Requests · 30d"
          value={usage.data ? usage.data.total_requests.toLocaleString() : "—"}
        />
        <StatCard
          label="Avg latency"
          value={usage.data?.avg_latency_ms != null ? `${usage.data.avg_latency_ms} ms` : "—"}
        />
        <StatCard label="Error rate" value={usage.data ? `${usage.data.error_rate_pct}%` : "—"} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Key</th>
              <th className="px-5 py-3 font-medium">Created</th>
              <th className="px-5 py-3 font-medium">Last used</th>
              <th className="px-5 py-3 font-medium text-right">Requests</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-muted-foreground">
                  Loading keys…
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-muted-foreground">
                  No API keys yet.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-4 font-medium">{k.name}</td>
                  <td className="px-5 py-4 font-mono text-xs">
                    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
                      {k.prefix}…
                      <Copy
                        className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => copy(k.prefix)}
                      />
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{k.created_at.slice(0, 10)}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}
                  </td>
                  <td className="px-5 py-4 text-right font-mono">{k.requests.toLocaleString()}</td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        await revokeKey.mutateAsync(k.id);
                        refetch();
                        toast.success("Key revoked");
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Revoke
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

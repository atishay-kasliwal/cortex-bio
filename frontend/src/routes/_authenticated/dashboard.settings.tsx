import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useConnectProvider,
  useDisconnectProvider,
  useProfile,
  useProviders,
  useUpdateProfile,
} from "@/lib/api/hooks";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — Atriveo Bio" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const profile = useProfile();
  const providers = useProviders();
  const updateProfile = useUpdateProfile();
  const connect = useConnectProvider();
  const disconnect = useDisconnectProvider();

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await updateProfile.mutateAsync({
        full_name: String(fd.get("full_name") ?? ""),
        timezone: String(fd.get("timezone") ?? ""),
      });
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, connected providers and notifications."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Profile" description="Your personal information and timezone.">
          <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
            <Field
              label="Full name"
              name="full_name"
              defaultValue={profile.data?.full_name ?? ""}
            />
            <Field label="Email" name="email" defaultValue={profile.data?.email ?? ""} readOnly />
            <Field
              label="Timezone"
              name="timezone"
              defaultValue={profile.data?.timezone ?? "America/Los_Angeles"}
            />
            <Field
              label="Chronotype"
              name="chronotype"
              defaultValue={profile.data?.chronotype?.classification ?? "—"}
              readOnly
            />
            <div className="md:col-span-2 mt-1 flex justify-end">
              <Button
                type="submit"
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                Save changes
              </Button>
            </div>
          </form>
        </Section>

        <Section title="Notifications" description="Choose what we send and how often.">
          <div className="space-y-4">
            <Toggle
              label="Morning readiness brief"
              desc="Daily at 06:30 in your timezone."
              defaultChecked
            />
            <Toggle
              label="Peak window alerts"
              desc="Notify 15 min before a peak focus window."
              defaultChecked
            />
            <Toggle
              label="Recovery warnings"
              desc="When HRV drops more than 15% week-over-week."
              defaultChecked
            />
            <Toggle label="Weekly performance report" desc="Sundays at 19:00." />
            <Toggle label="Product updates" desc="New features, model improvements." />
          </div>
        </Section>
      </div>

      <Section
        title="Connected providers"
        description="Wearables and platforms feeding into your Atriveo Bio profile."
      >
        <div className="divide-y divide-border rounded-lg border border-border">
          {(providers.data ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.connected ? (
                    <>
                      Connected
                      {p.last_sync_at
                        ? ` · last sync ${new Date(p.last_sync_at).toLocaleString()}`
                        : ""}
                    </>
                  ) : (
                    "Not connected"
                  )}
                </div>
              </div>
              {p.connected ? (
                <Button variant="outline" size="sm" onClick={() => disconnect.mutate(p.id)}>
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => connect.mutate(p.id)}
                >
                  Connect
                </Button>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Danger zone" description="Permanent actions affecting your account.">
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-5">
          <div>
            <div className="font-medium">Delete account</div>
            <div className="text-sm text-muted-foreground">
              All biometric data and forecasts will be erased.
            </div>
          </div>
          <Button variant="destructive">Delete account</Button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-medium tracking-tight">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  readOnly,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} readOnly={readOnly} />
    </div>
  );
}

function Toggle({
  label,
  desc,
  defaultChecked,
}: {
  label: string;
  desc: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

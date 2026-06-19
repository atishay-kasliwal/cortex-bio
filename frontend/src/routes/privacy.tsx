import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/legal-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Atriveo Bio" },
      { name: "description", content: "How Atriveo Bio collects, uses and protects your biometric and account data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="June 19, 2026">
      <p>This page is maintained by Atriveo, Inc. to explain how we handle data in Atriveo Bio. It is not a substitute for the binding legal terms in our Terms of Service.</p>
      <h2>Data we collect</h2>
      <p>Account data you give us directly (name, email, timezone), and biometric telemetry you authorize us to ingest from connected wearables (Apple Health, WHOOP, Oura, Garmin, Fitbit, Cortex). We also collect API usage metadata when you call our developer API.</p>
      <h2>How we use it</h2>
      <p>To generate your cognitive readiness scores, performance forecasts, deep-work windows and insights — and to operate, secure and improve the service.</p>
      <h2>Sharing</h2>
      <p>We do not sell your data. We share data only with infrastructure subprocessors needed to run the service and with parties you explicitly authorize via our API.</p>
      <h2>Retention &amp; deletion</h2>
      <p>You can delete your account from Settings at any time. On deletion, all linked biometric data is permanently removed.</p>
      <h2>Contact</h2>
      <p>Questions? <a href="mailto:privacy@atriveo.com" className="text-foreground underline">privacy@atriveo.com</a>.</p>
    </LegalShell>
  );
}
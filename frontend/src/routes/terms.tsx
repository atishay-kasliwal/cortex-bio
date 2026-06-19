import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/legal-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Atriveo Bio" },
      { name: "description", content: "The terms that govern your use of Atriveo Bio." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="June 19, 2026">
      <p>These Terms of Service govern your access to and use of Atriveo Bio. By creating an account, you agree to these terms.</p>
      <h2>Use of the service</h2>
      <p>You are responsible for activity under your account, including API key usage. Don't use the service to violate any law or interfere with other users.</p>
      <h2>Biometric data</h2>
      <p>You retain ownership of your biometric data. You grant us a limited license to process it solely to provide the service.</p>
      <h2>Plans &amp; billing</h2>
      <p>Paid plans renew automatically. You can cancel from the Billing settings; access continues until the end of the current period.</p>
      <h2>Termination</h2>
      <p>You can stop using Atriveo Bio at any time. We may suspend accounts that violate these terms or jeopardize the integrity of the service.</p>
      <h2>Disclaimer</h2>
      <p>Atriveo Bio is not a medical device and does not provide medical advice. Use it as one signal among many for personal performance decisions.</p>
    </LegalShell>
  );
}
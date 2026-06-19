import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";
import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial-fade" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <Link to="/" className="self-start">
          <Logo />
        </Link>
        <div className="my-auto">
          <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">© Atriveo, Inc.</p>
      </div>
    </div>
  );
}
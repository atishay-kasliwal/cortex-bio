import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-7 w-7 rounded-md bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] shadow-[0_0_24px_-6px_var(--brand)]">
        <div className="absolute inset-[3px] rounded-[5px] bg-background/40 backdrop-blur-sm" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-foreground" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h3l2-6 4 12 2-9 2 5h5" />
          </svg>
        </div>
      </div>
      <span className="text-[15px] font-semibold tracking-tight">
        Atriveo <span className="text-muted-foreground font-normal">Bio</span>
      </span>
    </div>
  );
}
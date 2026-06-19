import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground max-w-xs">
            Wearable intelligence for people who treat performance as a craft.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            ["Features", "#features"],
            ["How it works", "#how"],
            ["Pricing", "#pricing"],
          ]}
        />
        <FooterCol
          title="Developers"
          links={[
            ["Documentation", "/docs"],
            ["API reference", "/docs"],
            ["Status", "#"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["About", "#"],
            ["Privacy", "#"],
            ["Terms", "#"],
          ]}
        />
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Atriveo, Inc.</span>
          <span className="font-mono">bio.atriveo.com</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("/") ? (
              <Link to={href} className="hover:text-foreground transition">
                {label}
              </Link>
            ) : (
              <a href={href} className="hover:text-foreground transition">
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

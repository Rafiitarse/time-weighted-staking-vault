"use client";

/**
 * The one nav: brand mark, the three surfaces, the connect slot. Active
 * state needs the client router hook, hence "use client".
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { ConnectButton } from "@/components/ConnectButton";

function VaultMark() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="32"
        height="32"
        rx="9"
        stroke="#2DD4BF"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <circle cx="17" cy="17" r="10.5" stroke="#2DD4BF" strokeOpacity="0.5" strokeWidth="1.4" />
      <circle cx="17" cy="17" r="6.5" stroke="#2DD4BF" strokeOpacity="0.8" strokeWidth="1.4" />
      <circle cx="17" cy="17" r="2.4" fill="#2DD4BF" />
    </svg>
  );
}

const LINKS = [
  { href: "/", label: "Vault" },
  { href: "/legacy", label: "Legacy" },
  { href: "/admin", label: "Admin" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <VaultMark />
          <span className="text-sm font-semibold tracking-tight text-ink">
            Conviction Vault
          </span>
        </Link>

        <nav aria-label="Main" className="order-3 flex w-full items-center justify-center gap-1 md:order-2 md:w-auto">
          {LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-surface-raised font-medium text-ink"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 md:order-3"><ConnectButton /></div>
      </div>
    </header>
  );
}

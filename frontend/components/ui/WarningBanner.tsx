"use client";

/**
 * The one banner for warnings and hazards: reward-pool shortage
 * acknowledgement, guardian pause notices, stale-position notices, chain
 * mismatch. Hairline tinted border — no oversized color bars, no emoji.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { AlertIcon, InfoIcon } from "@/components/ui/icons";

export type BannerTone = "warning" | "danger" | "info";

const TONE_STYLES: Record<BannerTone, { border: string; bg: string; text: string; icon: ReactNode }> = {
  warning: {
    border: "border-warning/30",
    bg: "bg-warning/5",
    text: "text-warning",
    icon: <AlertIcon />,
  },
  danger: {
    border: "border-danger/30",
    bg: "bg-danger/5",
    text: "text-danger",
    icon: <AlertIcon />,
  },
  info: {
    border: "border-accent/25",
    bg: "bg-accent/5",
    text: "text-accent",
    icon: <InfoIcon />,
  },
};

export function WarningBanner({
  tone = "warning",
  title,
  children,
  className,
}: {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div
      role={tone === "info" ? "status" : "alert"}
      className={cn("flex gap-2.5 rounded-md border px-3 py-2.5 text-sm", s.border, s.bg, className)}
    >
      <span className={cn("mt-0.5 shrink-0", s.text)}>{s.icon}</span>
      <div className="min-w-0 text-[13px] leading-relaxed text-ink">
        {title ? (
          <p className={cn("mb-0.5 font-medium", s.text)}>
            {title}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

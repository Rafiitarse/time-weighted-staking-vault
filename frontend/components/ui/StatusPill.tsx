"use client";

/**
 * The one status vocabulary for the whole app: open / paused / not
 * configured / pending Safe / skipped reward. Each tone is a dot + label, no
 * icon fonts, no color-only meaning (the label always carries the word).
 */
import { cn } from "@/lib/format";

export type StatusTone = "neutral" | "open" | "paused" | "warn" | "danger" | "pending";

const TONE_STYLES: Record<StatusTone, { dot: string; text: string; ring: string }> = {
  neutral: { dot: "bg-ink-faint", text: "text-ink-muted", ring: "border-border" },
  open: { dot: "bg-ok", text: "text-ok", ring: "border-ok/25" },
  paused: { dot: "bg-warning", text: "text-warning", ring: "border-warning/25" },
  warn: { dot: "bg-warning", text: "text-warning", ring: "border-warning/25" },
  danger: { dot: "bg-danger", text: "text-danger", ring: "border-danger/25" },
  pending: { dot: "bg-accent", text: "text-accent", ring: "border-accent/25" },
};

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: string;
  className?: string;
}) {
  const s = TONE_STYLES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border bg-surface px-2 py-0.5 text-xs font-medium",
        s.ring,
        s.text,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", s.dot)} />
      {children}
    </span>
  );
}

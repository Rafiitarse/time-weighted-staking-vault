"use client";

/**
 * Chain numerals, never rounded away: a normalized value by default with a
 * toggle to the exact wei string, and copy-to-clipboard that always copies
 * the exact value. Mono face with tabular numerals.
 *
 * Copy feedback is one element for sighted and screen reader users: the
 * role="status" bubble next to the button. The button is never disabled while
 * feedback shows — copying is idempotent and retrying must stay possible.
 */
import { useEffect, useRef, useState } from "react";
import { cn, exactWei, formatToken } from "@/lib/format";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";

type Mode = "normalized" | "wei";
type Feedback = "copied" | "failed";

export function AmountDisplay({
  wei,
  decimals = 18,
  unit,
  className,
}: {
  wei: bigint;
  decimals?: number;
  unit?: string;
  className?: string;
}) {
  const [mode, setMode] = useState<Mode>("normalized");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const exact = exactWei(wei);
  const shown = mode === "normalized" ? formatToken(wei, decimals) : exact;

  async function copyExact() {
    // navigator.clipboard exists only in secure contexts (https / localhost);
    // the failure path announces itself instead of failing silently.
    try {
      await navigator.clipboard.writeText(exact);
      setFeedback("copied");
    } catch {
      setFeedback("failed");
    }
    timers.current.push(setTimeout(() => setFeedback(null), 2000));
  }

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="num text-ink" title={`${unit ?? ""} ${exact} wei`}>
        {shown}
        {unit ? <span className="text-ink-muted"> {unit}</span> : null}
      </span>

      <button
        type="button"
        onClick={() => setMode((m) => (m === "normalized" ? "wei" : "normalized"))}
        className="num rounded-sm border border-border px-1.5 py-px text-[10px] leading-none text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
        aria-label={mode === "normalized" ? "Show exact wei value" : "Show normalized value"}
      >
        {mode === "normalized" ? "wei" : "≈"}
      </button>

      <span className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => void copyExact()}
          className="inline-flex size-6 items-center justify-center rounded-sm text-ink-muted transition-colors hover:text-ink"
          aria-label={`Copy exact ${unit ?? "value"} in wei`}
        >
          {feedback === "copied" ? <CheckIcon /> : <CopyIcon />}
        </button>
        <span role="status" className="sr-only">
          {feedback === "copied" ? "Copied" : feedback === "failed" ? "Copy failed" : ""}
        </span>
      </span>
    </span>
  );
}

"use client";

/**
 * Countdown to a unix timestamp: next tier step, 48h admin-handover accept
 * window. Ticks once per second on the client; the server render shows a
 * placeholder so the fixed-width slot never shifts layout.
 */
import { useEffect, useState } from "react";
import { cn, formatDurationShort, formatUtcDate } from "@/lib/format";

export function Countdown({
  toUnix,
  passedLabel = "ready",
  className,
}: {
  toUnix: number;
  passedLabel?: string;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // First tick is scheduled, not synchronous: rAF keeps the effect body
    // free of sync setState, and the interval sustains the countdown.
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    const raf = requestAnimationFrame(tick);
    const timer = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, []);

  const remaining = now === null ? null : toUnix - now;

  return (
    <span
      className={cn("num inline-block min-w-12 text-ink", remaining !== null && remaining < 0 && "text-ink-muted", className)}
      title={formatUtcDate(toUnix)}
    >
      {remaining === null ? "—" : remaining < 0 ? passedLabel : formatDurationShort(remaining)}
    </span>
  );
}

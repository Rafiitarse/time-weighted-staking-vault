"use client";

/**
 * Wall clock as React state so time-dependent components stay pure during
 * render: no Date.now() in the component body. The first tick is scheduled
 * via rAF (mirrors Countdown), then the interval sustains updates; until the
 * first tick the value is null and callers render a placeholder. Rows pass a
 * slower interval — age in days does not need per-second precision.
 */
import { useEffect, useState } from "react";

export function useNowSeconds(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    const raf = requestAnimationFrame(tick);
    const timer = setInterval(tick, intervalMs);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}

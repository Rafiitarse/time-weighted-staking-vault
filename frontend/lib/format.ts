/**
 * Formatting helpers for numerals, addresses, and dates. All chain numerals
 * render in the mono face; ETH/CVR values show an exact-wei string alongside
 * the normalized form so nothing is ever silently rounded away.
 */
import { formatUnits } from "viem";

/** Lightweight classnames combiner so we don't need clsx/tailwind-merge. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

/** Exact-wei string, e.g. 1234500000000000000n -> "1234500000000000000". */
export function exactWei(wei: bigint): string {
  return wei.toString();
}

/**
 * Normalized token string, e.g. 1234500000000000000n -> "1.2345".
 * Floor-truncated at `decimals` (never rounds up — a displayed balance must
 * not exceed the real one).
 */
export function formatToken(wei: bigint, decimals = 18, display = 4): string {
  const full = formatUnits(wei, decimals);
  const [intPart, fracPart] = full.split(".");
  const trimmed = fracPart ? fracPart.slice(0, display) : "";
  const value = trimmed.length > 0 ? `${intPart}.${trimmed}` : intPart;
  return value;
}

/** Age in days (floor), for "aged 184 days" copy. */
export function ageInDays(ageSeconds: bigint): number {
  if (ageSeconds < 0n) return 0;
  return Number(ageSeconds / 86_400n);
}

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function getDurationParts(totalSeconds: number): DurationParts {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(safe / 86400),
    hours: Math.floor((safe % 86400) / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60,
  };
}

/** Compact duration string for countdowns, e.g. "183d 4h" or "6h 12m". */
export function formatDurationShort(totalSeconds: number): string {
  const { days, hours, minutes } = getDurationParts(totalSeconds);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** UTC timestamp in a fixed format: 2026-11-15 12:00 UTC. */
export function formatUtcDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

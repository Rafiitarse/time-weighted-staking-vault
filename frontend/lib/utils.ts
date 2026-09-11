/** Lightweight classnames combiner so we don't need to add clsx/tailwind-merge as a dependency. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export function formatAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

/** Formats a wei bigint as a locale-aware ETH string, e.g. 1234500000000000000n -> "1.2345". */
export function formatEth(wei: bigint | undefined, decimals = 4): string {
  if (wei === undefined) return "0";
  const ether = Number(wei) / 1e18;
  return ether.toLocaleString("id-ID", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
}

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function getDurationParts(totalSeconds: number): DurationParts {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return { days, hours, minutes, seconds };
}

/** Compact Indonesian duration string for live-ticking lot age, e.g. "142h 6j" or "6j 12m". */
export function formatDurationShort(totalSeconds: number): string {
  const { days, hours, minutes } = getDurationParts(totalSeconds);
  if (days > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

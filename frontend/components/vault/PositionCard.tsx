"use client";

/**
 * One position as a table row (stacked into a labeled card under 640px by
 * the .positions-region container rules in globals.css). All numerals are
 * mono; the tier percentage and countdown come from the contract's own
 * quote and the mirrored tier table.
 */
import Link from "next/link";
import type { DiscoveredPosition } from "@/lib/positionDiscovery";
import { multiplierForAge, nextTier, SECONDS_PER_DAY } from "@/lib/tiers";
import { ageInDays } from "@/lib/format";
import { useNowSeconds } from "@/lib/useNow";
import { StatusPill } from "@/components/ui/StatusPill";
import { Countdown } from "@/components/ui/Countdown";
import { AmountDisplay } from "@/components/ui/AmountDisplay";

function tierPercent(multiplier: bigint): string {
  // Multiplier is in thousandths: 25 -> "2.5%", 150 -> "15%".
  const whole = multiplier / 10n;
  const tenth = multiplier % 10n;
  return tenth === 0n ? `${whole}%` : `${whole}.${tenth}%`;
}

export function PositionRow({ position, stale }: { position: DiscoveredPosition; stale: boolean }) {
  // Wall clock as state (see useNowSeconds): the render body stays pure.
  // Row ages render in days, so a slow 30s tick is plenty.
  const now = useNowSeconds(30_000);
  const nowSeconds = now === null ? null : BigInt(now);
  const ageSeconds =
    nowSeconds !== null && nowSeconds > position.depositedAt
      ? nowSeconds - position.depositedAt
      : null;
  const age = ageSeconds !== null ? ageInDays(ageSeconds) : null;
  const currentMultiplier =
    position.quote?.multiplier ??
    (ageSeconds !== null ? multiplierForAge(ageSeconds) : null);
  const upcoming = ageSeconds !== null ? nextTier(ageSeconds) : null;
  const nextAt = upcoming
    ? Number(position.depositedAt + BigInt(upcoming.days) * SECONDS_PER_DAY)
    : 0;

  return (
    <tr className={stale ? "opacity-60" : undefined}>
      <td data-label="Position" className="num">
        <span className="font-medium">#{position.tokenId.toString()}</span>
        {stale ? (
          <span className="ml-2">
            <StatusPill tone="warn">Transferred away</StatusPill>
          </span>
        ) : null}
      </td>
      <td data-label="Staked">
        <AmountDisplay wei={position.remainingPrincipal} unit="ETH" />
      </td>
      <td data-label="Age" className="num">
        {age === null ? "—" : `${age} d`}
      </td>
      <td data-label="Maturity bonus" className="num">
        {currentMultiplier === null ? "—" : tierPercent(currentMultiplier)}
      </td>
      <td data-label="Next tier">
        {upcoming === null ? (
          ageSeconds === null ? (
            <span className="text-ink-faint">…</span>
          ) : (
            <span className="text-ink-faint">at cap</span>
          )
        ) : (
          <span className="num inline-flex items-baseline gap-1.5">
            <span className="text-ink-faint">{tierPercent(BigInt(upcoming.multiplier))} in</span>
            <Countdown toUnix={nextAt} passedLabel="—" />
          </span>
        )}
      </td>
      <td data-label="Actions" className="text-right">
        {stale ? (
          <span className="text-xs text-ink-faint">—</span>
        ) : (
          <Link
            href={`/positions/${position.tokenId.toString()}`}
            className="text-sm font-medium text-accent hover:text-accent-strong"
          >
            Withdraw →
          </Link>
        )}
      </td>
    </tr>
  );
}

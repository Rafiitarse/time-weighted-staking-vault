/**
 * Mirror of ConvictionVault._calculateReward: the conviction bonus schedule.
 * One-time maturity bonus on withdrawn principal, paid in CVR. Never
 * annualized — no yield/APY/APR vocabulary may appear anywhere this feeds.
 */

export const SECONDS_PER_DAY = 86_400n;

export interface Tier {
  /** Minimum position age in days. */
  readonly days: number;
  /** Reward multiplier in thousandths (25 = 2.5% of the withdrawn amount). */
  readonly multiplier: number;
}

export const TIERS: readonly Tier[] = [
  { days: 183, multiplier: 25 },
  { days: 366, multiplier: 50 },
  { days: 549, multiplier: 75 },
  { days: 732, multiplier: 100 },
  { days: 915, multiplier: 125 },
  { days: 1098, multiplier: 150 },
];

/** Final multiplier cap in thousandths; kept here so callers never re-derive it. */
export const MAX_MULTIPLIER = 150n;

export interface Quote {
  multiplier: bigint;
  rewardAmount: bigint;
}

/**
 * The multiplier a position of `ageSeconds` currently earns, in thousandths.
 * Matches the contract's inclusive-lower-bound tier table and floor division.
 */
export function multiplierForAge(ageSeconds: bigint): bigint {
  if (ageSeconds < 0n) return 0n;
  let multiplier = 0n;
  for (const tier of TIERS) {
    if (ageSeconds >= BigInt(tier.days) * SECONDS_PER_DAY) {
      multiplier = BigInt(tier.multiplier);
    }
  }
  return multiplier;
}

/** Contract-mirroring floor: rewardAmount = amount * multiplier / 1000. */
export function quoteReward(amountWei: bigint, ageSeconds: bigint): Quote {
  const multiplier = multiplierForAge(ageSeconds);
  return { multiplier, rewardAmount: (amountWei * multiplier) / 1000n };
}

/**
 * The next tier the position will reach, or null at the cap.
 * Tiers are inclusive lower bounds, so a position exactly on a tier has the
 * tier *after* it as its next.
 */
export function nextTier(ageSeconds: bigint): Tier | null {
  for (const tier of TIERS) {
    if (ageSeconds < BigInt(tier.days) * SECONDS_PER_DAY) return tier;
  }
  return null;
}

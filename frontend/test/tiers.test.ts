import { describe, expect, it } from "vitest";
import { multiplierForAge, quoteReward, nextTier, SECONDS_PER_DAY, TIERS } from "@/lib/tiers";

const DAY = SECONDS_PER_DAY;

describe("multiplierForAge", () => {
  it("returns 0 for a fresh position", () => {
    expect(multiplierForAge(0n)).toBe(0n);
  });

  it("returns 0 one second before each tier boundary", () => {
    for (const threshold of TIERS) {
      expect(multiplierForAge(BigInt(threshold.days) * DAY - 1n)).toBe(
        BigInt(TIERS[TIERS.indexOf(threshold) - 1]?.multiplier ?? 0),
      );
    }
  });

  it("returns the tier multiplier exactly at each boundary", () => {
    for (const tier of TIERS) {
      expect(multiplierForAge(BigInt(tier.days) * DAY)).toBe(BigInt(tier.multiplier));
    }
  });

  it("holds the cap at 150 beyond the last tier", () => {
    expect(multiplierForAge(50n * 365n * DAY)).toBe(150n);
  });
});

describe("quoteReward", () => {
  it("quotes 0 for a fresh position regardless of amount", () => {
    expect(quoteReward(1_000_000_000_000_000_000n, 0n).rewardAmount).toBe(0n);
  });

  it("quotes 25‰ at the 183-day boundary", () => {
    const amount = 1_000_000_000_000_000_000n; // 1 ETH
    const q = quoteReward(amount, 183n * DAY);
    expect(q.multiplier).toBe(25n);
    expect(q.rewardAmount).toBe(25_000_000_000_000_000_000n / 1000n);
  });

  it("floors rounding: 1 wei at tier 25 quotes 0", () => {
    expect(quoteReward(1n, 183n * DAY).rewardAmount).toBe(0n);
  });

  it("caps at 150‰ and floors", () => {
    const amount = 3n;
    expect(quoteReward(amount, 200n * 365n * DAY).rewardAmount).toBe(0n); // floor(3*150/1000)=0
    expect(quoteReward(1000n, 200n * 365n * DAY).rewardAmount).toBe(150n);
  });

  it("never exceeds 150 per 1000 for arbitrary inputs", () => {
    for (const amount of [1n, 7n, 999n, 1000n, 12345n, 10n ** 18n]) {
      for (const age of [0n, 1n, 183n * DAY, 549n * DAY + 5n]) {
        const q = quoteReward(amount, age);
        expect(q.rewardAmount * 1000n).toBeLessThanOrEqual(amount * 150n);
      }
    }
  });
});

describe("nextTier", () => {
  it("returns the first tier for a fresh position", () => {
    expect(nextTier(0n)).toEqual({ days: 183, multiplier: 25 });
  });

  it("returns the next tier mid-range", () => {
    expect(nextTier(366n * DAY + 1n)).toEqual({ days: 549, multiplier: 75 });
  });

  it("returns null at the final cap", () => {
    expect(nextTier(1098n * DAY)).toBeNull();
  });
});

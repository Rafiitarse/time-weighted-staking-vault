import { DepositCard } from "@/components/vault/DepositCard";
import { PositionList } from "@/components/vault/PositionList";
import { TIERS } from "@/lib/tiers";

/**
 * The Vault surface: deposit on the left, your positions on the right. The
 * root layout provides the nav, status strip and wallet connection; the
 * event bridge keeps both panels fresh from chain events.
 */
export default function VaultPage() {
  return (
    <div className="flex flex-col gap-8">
      <section data-enter className="flex min-h-[calc(100svh-170px)] flex-col justify-center gap-8 rounded-2xl border border-border bg-surface p-6 md:grid md:grid-cols-[1fr_auto] md:items-end md:p-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Conviction Vault · ETH positions</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">ETH staking, with transparent rewards.</h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">A one-time CVR bonus is calculated from the principal you withdraw and the position’s age. ETH principal remains withdrawable at any time; maturity affects the bonus only.</p>
        </div>
        <div className="flex flex-wrap gap-3"><a href="#your-position" className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-strong">Open a position</a><a href="#bonus-schedule" className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-raised">Review bonus schedule ↓</a></div>
      </section>
      <section id="bonus-schedule" data-visual className="grid min-h-[calc(100svh-120px)] content-center gap-6 rounded-xl border border-border bg-surface p-5 md:grid-cols-[1fr_1.2fr] md:p-6">
        <div><h2 className="font-semibold">One-time maturity bonus</h2><p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">Rates apply once to the principal amount withdrawn, not per year. CVR is a reward token with no redemption value, revenue share, or governance rights.</p><p className="mt-3 rounded-md border border-accent/20 bg-accent/5 p-3 text-sm text-ink"><strong className="font-semibold">ETH is not time-locked.</strong> You can withdraw principal at any time. If the pool cannot cover a full reward, that withdrawal can still return principal with no CVR payout.</p></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">CVR one-time bonus by position age</caption><thead><tr className="border-b border-border text-xs text-ink-muted"><th scope="col" className="pb-2 font-medium">Position age</th><th scope="col" className="pb-2 text-right font-medium">Bonus on withdrawn principal</th></tr></thead><tbody><tr className="border-b border-border/70"><th scope="row" className="py-2 font-normal text-ink-muted">Under 183 days</th><td className="num py-2 text-right">0%</td></tr>{TIERS.map(tier => <tr key={tier.days} className="border-b border-border/70 last:border-0"><th scope="row" className="py-2 font-normal text-ink-muted">{tier.days.toLocaleString()} days and over</th><td className="num py-2 text-right">{(tier.multiplier / 10).toFixed(1)}%</td></tr>)}</tbody></table></div>
      </section>
      <div id="your-position" className="grid items-start gap-8 lg:grid-cols-2">
        <DepositCard />
        <PositionList />
      </div>
    </div>
  );
}

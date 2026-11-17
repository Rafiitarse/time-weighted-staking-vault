"use client";

/**
 * Detail view for one Conviction Position: chain-pinned reads of ownerOf and
 * positions(tokenId), the tier state from the mirrored schedule, and the
 * withdraw panel. A burned token (full withdrawal) keeps its last outcome on
 * screen instead of collapsing into an error.
 */
import { useAccount, useChainId, useReadContract } from "wagmi";
import Link from "next/link";
import { useState } from "react";
import { useDeployment } from "@/lib/deployment-context";
import { ABIS, vaultAddress } from "@/lib/contracts";
import { nextTier, SECONDS_PER_DAY, TIERS } from "@/lib/tiers";
import { ageInDays, formatUtcDate } from "@/lib/format";
import { useNowSeconds } from "@/lib/useNow";
import { WithdrawPanel, type WithdrawOutcome } from "@/components/vault/WithdrawPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { WarningBanner } from "@/components/ui/WarningBanner";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { Countdown } from "@/components/ui/Countdown";
import { ConnectButton } from "@/components/ConnectButton";
import { StatusPill } from "@/components/ui/StatusPill";

function tierPercent(multiplier: bigint): string {
  const whole = multiplier / 10n;
  const tenth = multiplier % 10n;
  return tenth === 0n ? `${whole}%` : `${whole}.${tenth}%`;
}

export function PositionDetail({ tokenId }: { tokenId: bigint }) {
  const { chainId, metadata } = useDeployment();
  const account = useAccount();
  const walletChainId = useChainId();
  const [outcome, setOutcome] = useState<WithdrawOutcome | null>(null);
  // Wall clock as state (see useNowSeconds) — called unconditionally before
  // any early return, per rules of hooks.
  const now = useNowSeconds(1000);

  const vault = vaultAddress(metadata);
  const wrongChain = account.isConnected && walletChainId !== chainId;

  const owner = useReadContract({
    address: vault,
    abi: ABIS.vault,
    functionName: "ownerOf",
    args: [tokenId],
    chainId,
    query: { enabled: !!account.address, retry: false },
  });

  const position = useReadContract({
    address: vault,
    abi: ABIS.vault,
    functionName: "positions",
    args: [tokenId],
    chainId,
    query: { enabled: !!account.address, retry: false },
  });

  if (!account.isConnected) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState title="Connect a wallet to view this position">
          CVP #{tokenId.toString()} — you need to connect to read its chain state.
        </EmptyState>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  // Burned or nonexistent: keep the confirmed outcome visible after a full
  // withdrawal, otherwise explain plainly.
  if (owner.isError || position.isError) {
    return outcome ? (
      <div className="flex flex-col gap-3">
        <WithdrawOutcomeCard tokenId={tokenId} outcome={outcome} />
        <EmptyState title={`CVP #${tokenId.toString()} is closed`}>
          The full withdrawal burned this position. Its history stays in the transaction
          receipt.
        </EmptyState>
        <Link href="/" className="text-sm font-medium text-accent hover:text-accent-strong">
          ← Back to your positions
        </Link>
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        <EmptyState title={`Position #${tokenId.toString()} does not exist`}>
          No CVP with this id is on {metadata.network}. It may have been closed by a full
          withdrawal, or the id is wrong.
        </EmptyState>
        <Link href="/" className="text-sm font-medium text-accent hover:text-accent-strong">
          ← Back to your positions
        </Link>
      </div>
    );
  }

  const positionTuple = position.data as [bigint, bigint] | undefined;
  if (owner.isLoading || position.isLoading || !positionTuple) {
    return <EmptyState title="Reading position from the chain" />;
  }

  const ownerAddress = owner.data as string;
  const [remainingPrincipal, depositedAt] = positionTuple;
  const isOwner = ownerAddress.toLowerCase() === (account.address ?? "").toLowerCase();
  const ageSeconds =
    now !== null && BigInt(now) > depositedAt ? BigInt(now) - depositedAt : null;
  const age = ageSeconds !== null ? ageInDays(ageSeconds) : null;
  const currentTier = ageSeconds !== null ? tierFor(ageSeconds) : null;
  const upcoming = ageSeconds !== null ? nextTier(ageSeconds) : null;
  const nextAt = upcoming ? Number(depositedAt + BigInt(upcoming.days) * SECONDS_PER_DAY) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="num text-lg font-semibold tracking-tight">CVP #{tokenId.toString()}</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            Opened {formatUtcDate(Number(depositedAt))}
            {age === null ? "" : ` · aged ${age} days`}
          </p>
        </div>
        <StatusPill tone={isOwner ? "open" : "warn"}>
          {isOwner ? "Owned by this wallet" : "Not owned by this wallet"}
        </StatusPill>
      </div>

      {!isOwner ? (
        <WarningBanner tone="warning" title="You do not own this position">
          The current owner is{" "}
          <span className="num">
            {ownerAddress.slice(0, 10)}…{ownerAddress.slice(-6)}
          </span>
          . Only the current owner can withdraw from it — CVR always follows the NFT.
        </WarningBanner>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs text-ink-muted">Remaining principal</p>
          <div className="mt-1">
            <AmountDisplay wei={remainingPrincipal} unit="ETH" className="text-base" />
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs text-ink-muted">Current maturity bonus</p>
          <p className="num mt-1 text-base font-medium text-accent">
            {currentTier === null ? "—" : tierPercent(currentTier)}{" "}
            <span className="text-xs font-normal text-ink-faint">of withdrawn principal</span>
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs text-ink-muted">
            {upcoming ? `Next tier — ${tierPercent(BigInt(upcoming.multiplier))}` : "Schedule"}
          </p>
          <p className="mt-1 text-sm">
            {upcoming === null ? (
              ageSeconds === null ? (
                <span className="text-ink-muted">…</span>
              ) : (
                <span className="text-ink-muted">Cap reached — 15% is the maximum bonus.</span>
              )
            ) : (
              <span className="num inline-flex items-baseline gap-1.5">
                <Countdown toUnix={nextAt} />
                <span className="text-xs text-ink-faint">until {tierPercent(BigInt(upcoming.multiplier))}</span>
              </span>
            )}
          </p>
        </div>
      </div>

      {isOwner && !wrongChain ? (
        <WithdrawPanel
          tokenId={tokenId}
          remainingPrincipal={remainingPrincipal}
          onOutcome={setOutcome}
        />
      ) : isOwner && wrongChain ? (
        <WarningBanner tone="info" title="Wallet on another chain">
          Switch your wallet to {metadata.network} (chain {chainId}) using the banner at the top
          to withdraw.
        </WarningBanner>
      ) : null}

      <Link href="/" className="text-sm font-medium text-accent hover:text-accent-strong">
        ← Back to your positions
      </Link>
    </div>
  );
}

function tierFor(ageSeconds: bigint): bigint {
  // Local mirror is only used for display; the withdraw quote comes from the
  // contract itself.
  let multiplier = 0n;
  for (const tier of TIERS) {
    if (ageSeconds >= BigInt(tier.days) * SECONDS_PER_DAY) multiplier = BigInt(tier.multiplier);
  }
  return multiplier;
}

function WithdrawOutcomeCard({ tokenId, outcome }: { tokenId: bigint; outcome: WithdrawOutcome }) {
  return (
    <div className="rounded-md border border-ok/25 bg-ok/5 p-4" role="status">
      <p className="text-sm font-medium text-ok">Withdrawal confirmed — CVP #{tokenId.toString()}</p>
      {outcome.paid ? (
        <p className="num mt-1 text-[13px] text-ink">
          Bonus paid: {outcome.paid.amount.toString()} wei CVR
        </p>
      ) : outcome.skipped ? (
        <p className="mt-1 text-[13px] text-warning">
          CVR bonus skipped: {outcome.skipped.reasonLabel}.
        </p>
      ) : null}
    </div>
  );
}

"use client";

/**
 * The withdraw panel for one position: ETH amount (Max = remaining
 * principal), an ETH recipient (defaults to the wallet), and the live quote
 * for the one-time maturity bonus. The pool state never disables the
 * withdraw button — a shortage turns into an explicit warning ("withdraw
 * now, no CVR" vs "wait") while withdrawal itself always stays available.
 * CVR always goes to the current position owner; the recipient receives the
 * ETH principal only.
 */
import { useState } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { formatEther, formatUnits, parseEther } from "viem";
import { useDeployment } from "@/lib/deployment-context";
import { ABIS, distributorAddress, explorerBaseUrl, vaultAddress, ZERO } from "@/lib/contracts";
import { parseConvictionReceipt, type RewardPaidEvent, type RewardSkippedEvent } from "@/lib/receipt";
import { formatToken } from "@/lib/format";
import { TxButton } from "@/components/ui/TxButton";
import { WarningBanner } from "@/components/ui/WarningBanner";
import { StatusPill } from "@/components/ui/StatusPill";
import { AmountDisplay } from "@/components/ui/AmountDisplay";

export interface WithdrawOutcome {
  withdrawn: { amount: bigint } | null;
  paid: RewardPaidEvent | null;
  skipped: RewardSkippedEvent | null;
  /** No CVR bonus was due (position age below the first tier). */
  noBonusDue: boolean;
  fullWithdraw: boolean;
}

function tierPercent(multiplier: bigint): string {
  const whole = multiplier / 10n;
  const tenth = multiplier % 10n;
  return tenth === 0n ? `${whole}%` : `${whole}.${tenth}%`;
}

export function WithdrawPanel({
  tokenId,
  remainingPrincipal,
  onOutcome,
}: {
  tokenId: bigint;
  remainingPrincipal: bigint;
  onOutcome: (outcome: WithdrawOutcome) => void;
}) {
  const { chainId, metadata } = useDeployment();
  const account = useAccount();
  const walletChainId = useChainId();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<WithdrawOutcome | null>(null);

  const vault = vaultAddress(metadata);
  const wrongChain = account.isConnected && walletChainId !== chainId;

  const effectiveRecipient = recipient ?? account.address ?? "";
  const isFull = amountWei() === remainingPrincipal;

  function amountWei(): bigint | null {
    if (amount.trim() === "") return null;
    try {
      return parseEther(amount.replace(",", ".") as `${number}`);
    } catch {
      return null;
    }
  }

  const quote = useReadContract({
    address: vault,
    abi: ABIS.vault,
    functionName: "quoteReward",
    args: [tokenId, amountWei() ?? 0n],
    chainId,
    query: { enabled: (amountWei() ?? 0n) > 0n && (amountWei() ?? 0n) <= remainingPrincipal },
  });

  const distributorAddr = useReadContract({
    address: vault,
    abi: ABIS.vault,
    functionName: "rewardDistributor",
    chainId,
  });
  const distributorConfigured = distributorAddr.data !== undefined && distributorAddr.data !== ZERO;

  const available = useReadContract({
    address: distributorAddress(metadata),
    abi: ABIS.distributor,
    functionName: "availableRewards",
    chainId,
    query: { enabled: distributorConfigured },
  });

  const quoteTuple = quote.data as [bigint, bigint] | undefined;
  const quoteMultiplier = quoteTuple?.[0];
  const quoteRewardAmount = quoteTuple?.[1];
  const availableRewards = available.data as bigint | undefined;
  const shortage =
    quoteRewardAmount !== undefined &&
    availableRewards !== undefined &&
    quoteRewardAmount > availableRewards;

  function validate(): string | null {
    if (amount.trim() === "") return "Enter an amount in ETH.";
    const wei = amountWei();
    if (wei === null) return "That is not a valid ETH amount.";
    if (wei <= 0n) return "Amount must be greater than zero.";
    if (wei > remainingPrincipal)
      return `Not enough remaining principal — this position holds ${remainingPrincipal.toString()} wei.`;
    if (!effectiveRecipient) return "Enter a recipient address for the ETH.";
    if (effectiveRecipient.toLowerCase() === ZERO.toLowerCase())
      return "The recipient cannot be the zero address.";
    return null;
  }

  function send(): Promise<`0x${string}`> {
    // Untyped ABI: the parameter object is cast (see DepositCard for the
    // rationale); arg shapes verified against the ABI by chain reads.
    return writeContractAsync({
      address: vault,
      abi: ABIS.vault,
      functionName: "withdraw",
      args: [tokenId, amountWei() as bigint, effectiveRecipient as `0x${string}`],
      chainId,
    } as never);
  }

  function handleConfirmed(_hash: `0x${string}`, receipt: unknown) {
    const parsed = parseConvictionReceipt(
      receipt as { logs: Parameters<typeof parseConvictionReceipt>[0]["logs"] },
      vault,
    );
    const result: WithdrawOutcome = {
      withdrawn: parsed.withdrawn[0] ? { amount: parsed.withdrawn[0].amount } : null,
      paid: parsed.rewardsPaid[0] ?? null,
      skipped: parsed.rewardsSkipped[0] ?? null,
      noBonusDue: parsed.rewardsPaid.length === 0 && parsed.rewardsSkipped.length === 0,
      fullWithdraw: isFull,
    };
    setOutcome(result);
    onOutcome(result);
  }

  return (
    <section aria-labelledby="withdraw-heading" className="rounded-md border border-border bg-surface p-5">
      <h2 id="withdraw-heading" className="text-sm font-semibold tracking-tight">
        Withdraw
      </h2>
      <p className="mt-1 text-[13px] text-ink-muted">
        Remaining principal:{" "}
        <AmountDisplay wei={remainingPrincipal} unit="ETH" />
      </p>

      {outcome ? (
        <div className="mt-4 flex flex-col gap-2" role="status">
          <div className="flex items-center gap-2">
            <StatusPill tone="open">Withdraw confirmed</StatusPill>
          </div>
          {outcome.withdrawn ? (
            <p className="text-[13px] text-ink">
              Principal sent: <span className="num font-medium">{formatEther(outcome.withdrawn.amount)} ETH</span>
            </p>
          ) : null}
          {outcome.paid ? (
            <p className="text-[13px] text-ink">
              One-time maturity bonus paid:{" "}
              <span className="num font-medium text-accent">
                {formatToken(outcome.paid.amount)} CVR
              </span>{" "}
              <span className="text-ink-muted">({tierPercent(outcome.paid.multiplier)} of withdrawn principal)</span>
            </p>
          ) : outcome.skipped ? (
            <WarningBanner tone="warning" title="Principal arrived — CVR bonus skipped">
              {outcome.skipped.reasonLabel}: the pool could not cover{" "}
              <span className="num">{formatToken(outcome.skipped.requestedAmount)}</span> CVR at
              payout time. Your ETH principal is safe in the recipient wallet. The bonus is
              one-time and is not retried for this withdrawal.
            </WarningBanner>
          ) : outcome.noBonusDue ? (
            <p className="text-[13px] text-ink-muted">
              No CVR bonus was due: positions younger than 183 days carry a 0% maturity bonus.
            </p>
          ) : null}
          {outcome.fullWithdraw ? (
            <p className="text-[13px] text-ink-muted">
              Position closed — CVP #{tokenId.toString()} was burned on full withdrawal.
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={(e) => e.preventDefault()} className="mt-4 flex flex-col gap-3" noValidate>
        <label htmlFor={`withdraw-amount-${tokenId}`} className="text-xs font-medium text-ink-muted">
          Amount (ETH)
        </label>
        <div className="relative">
          <input
            id={`withdraw-amount-${tokenId}`}
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => {
              if (amount.trim() !== "" || error) setError(validate());
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? `withdraw-amount-error-${tokenId}` : undefined}
            className={`h-10 w-full rounded-md border bg-surface-raised px-3 pr-16 text-sm text-ink transition-colors outline-none focus:border-accent ${
              error ? "border-danger" : "border-border"
            }`}
          />
          <button
            type="button"
            onClick={() => {
              setAmount(formatUnits(remainingPrincipal, 18));
              setError(null);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm border border-border px-2 py-0.5 text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Max
          </button>
        </div>
        {error ? (
          <p id={`withdraw-amount-error-${tokenId}`} className="text-xs text-danger">
            {error}
          </p>
        ) : null}

        <label htmlFor={`withdraw-recipient-${tokenId}`} className="text-xs font-medium text-ink-muted">
          ETH recipient
        </label>
        <input
          id={`withdraw-recipient-${tokenId}`}
          name="recipient"
          type="text"
          spellCheck={false}
          autoComplete="off"
          placeholder={account.address ?? "0x…"}
          value={recipient ?? ""}
          onChange={(e) => setRecipient(e.target.value)}
          className="num h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-ink transition-colors outline-none focus:border-accent"
        />

        {quoteRewardAmount !== undefined && quoteMultiplier !== undefined ? (
          <div className="num rounded-md border border-border bg-surface-raised px-3 py-2 text-[13px] text-ink">
            <div>
              One-time maturity bonus:{" "}
              <span className="font-medium text-accent">{tierPercent(quoteMultiplier)}</span> →{" "}
              {formatToken(quoteRewardAmount)} CVR
            </div>
            {availableRewards !== undefined ? (
              <div className="mt-0.5 text-xs text-ink-muted">
                Reward pool: {formatToken(availableRewards)} CVR
              </div>
            ) : null}
          </div>
        ) : (amountWei() ?? 0n) > remainingPrincipal ? null : (
          <p className="num text-xs text-ink-faint">
            Enter an amount to see the maturity bonus quote.
          </p>
        )}

        {shortage ? (
          <WarningBanner tone="warning" title="The reward pool cannot cover this bonus">
            The pool holds {formatToken(availableRewards as bigint)} CVR but the quote needs{" "}
            {formatToken(quoteRewardAmount as bigint)} CVR.{" "}
            <span className="font-medium">Withdraw now</span> and your ETH principal still
            arrives — with no CVR. <span className="font-medium">Or wait:</span> the pool may
            refill; your bonus rate only grows with position age, never with pool size.
          </WarningBanner>
        ) : null}

        {wrongChain ? (
          <WarningBanner tone="info" title="Wallet on another chain">
            Switch your wallet to {metadata.network} (chain {chainId}) using the banner at the
            top, then withdraw.
          </WarningBanner>
        ) : null}

        <TxButton
          label={
            shortage
              ? `Withdraw ${formatToken(amountWei() ?? 0n)} ETH — no CVR bonus`
              : amountWei() !== null
                ? `Withdraw ${formatToken(amountWei() as bigint)} ETH`
                : "Withdraw"
          }
          send={send}
          system="conviction"
          validate={validate}
          type="submit"
          explorerBaseUrl={explorerBaseUrl(metadata)}
          onConfirmed={handleConfirmed}
          className="mt-1 w-full [&>button]:w-full"
        />

        <p className="text-xs text-ink-faint">
          CVR goes to the current position owner — the wallet holding CVP #{tokenId.toString()}.
          The recipient field receives the ETH principal only. CVR has no redemption value,
          revenue share, or governance rights.
        </p>
      </form>
    </section>
  );
}

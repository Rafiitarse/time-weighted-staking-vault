"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  STAKING_VAULT_ABI,
  STAKING_VAULT_ADDRESS,
  STAKING_VAULT_CHAIN,
  getMultiplierForAge,
  getNextTier,
  parseContractError,
} from "@/lib/contract";
import { formatDurationShort, formatEth } from "@/lib/utils";
import { useToast } from "@/lib/toast";

/** Shared 1-second clock so every lot row re-renders off a single interval. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function UserLotsList() {
  const { address, isConnected } = useAccount();
  const now = useNow();

  const {
    data: lots,
    isLoading,
    refetch,
  } = useReadContract({
    address: STAKING_VAULT_ADDRESS,
    abi: STAKING_VAULT_ABI,
    functionName: "getUserLots",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  // Refresh automatically whenever this user deposits or withdraws, from
  // any component/tab — no manual wiring needed with DepositCard.
  useWatchContractEvent({
    address: STAKING_VAULT_ADDRESS,
    abi: STAKING_VAULT_ABI,
    eventName: "Deposited",
    args: address ? { user: address } : undefined,
    onLogs: () => refetch(),
  });

  useWatchContractEvent({
    address: STAKING_VAULT_ADDRESS,
    abi: STAKING_VAULT_ABI,
    eventName: "Withdrawn",
    args: address ? { user: address } : undefined,
    onLogs: () => refetch(),
  });

  if (!isConnected) {
    return (
      <EmptyState
        title="Wallet not connected"
        description="Connect your wallet to view your active deposit lots."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }

  const activeLots = (lots ?? []).filter((lot) => lot.amount > 0n);

  if (activeLots.length === 0) {
    return (
      <EmptyState
        title="No active lots"
        description="Make your first deposit to start earning rewards."
      />
    );
  }

  return (
    <div className="space-y-3">
      {(lots ?? []).map((lot, index) =>
        lot.amount > 0n ? (
          <LotRow
            key={index}
            lotId={index}
            amount={lot.amount}
            timestamp={lot.timestamp}
            now={now}
            onChanged={refetch}
          />
        ) : null,
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] px-6 py-10 text-center">
      <p className="text-sm font-medium text-[#E8E6E1]">{title}</p>
      <p className="mt-1 text-sm text-[#8B93A1]">{description}</p>
    </div>
  );
}

function LotRow({
  lotId,
  amount,
  timestamp,
  now,
  onChanged,
}: {
  lotId: number;
  amount: bigint;
  timestamp: bigint;
  now: number;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const toast = useToast();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const ageSeconds = Math.max(0, now - Number(timestamp));
  const ageDays = ageSeconds / 86400;
  const tier = getMultiplierForAge(ageDays);
  const nextTier = getNextTier(ageDays);

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const isWrongNetwork = chainId !== STAKING_VAULT_CHAIN.id;

  useEffect(() => {
    if (isSuccess) {
      toast.success(
        "Withdraw successful",
        `Lot #${lotId} has been partially or fully withdrawn.`,
      );
      setWithdrawAmount("");
      setExpanded(false);
      reset();
      onChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  useEffect(() => {
    const err = writeError ?? receiptError;
    if (err) toast.error("Withdraw failed", parseContractError(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeError, receiptError]);

  const withdrawValue = useMemo(() => {
    try {
      return withdrawAmount ? parseEther(withdrawAmount) : 0n;
    } catch {
      return 0n;
    }
  }, [withdrawAmount]);

  const isValidWithdraw = withdrawValue > 0n && withdrawValue <= amount;
  const estimatedReward = (withdrawValue * BigInt(tier.bps)) / 1000n;

  function handleWithdraw() {
    if (!isValidWithdraw) return;
    writeContract({
      address: STAKING_VAULT_ADDRESS,
      abi: STAKING_VAULT_ABI,
      functionName: "withdrawFromLot",
      args: [BigInt(lotId), withdrawValue],
    });
  }

  function setMax() {
    setWithdrawAmount(formatEther(amount));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold"
            style={{
              borderColor: `${tier.color}55`,
              color: tier.color,
              backgroundColor: `${tier.color}14`,
            }}
          >
            #{lotId}
          </div>
          <div>
            <p className="text-sm font-medium text-[#E8E6E1]">
              {formatEth(amount)} ETH
            </p>
            <p className="mt-0.5 text-xs text-[#8B93A1]">
              Age: {formatDurationShort(ageSeconds)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="rounded-full border px-3 py-1 text-[11px] font-medium whitespace-nowrap"
            style={{
              borderColor: `${tier.color}40`,
              color: tier.color,
              backgroundColor: `${tier.color}12`,
            }}
          >
            {tier.bps === 0
              ? "No Bonus Available"
              : `${tier.label} Bonus Reward Active`}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`shrink-0 text-[#8B93A1] transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path
              d="M2 5l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] px-5 py-4">
          {nextTier && (
            <p className="mb-3 text-xs text-[#8B93A1]">
              {Math.max(0, Math.ceil(nextTier.minDays - ageDays))} days left
              to reach tier {nextTier.label}.
            </p>
          )}

          <label className="mb-2 block text-xs font-medium text-[#8B93A1]">
            Withdraw Amount
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-2.5">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="0.0"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={isPending || isConfirming}
              className="w-full bg-transparent text-sm text-[#E8E6E1] outline-none placeholder:text-[#4A5160] disabled:opacity-50"
            />
            <button
              onClick={setMax}
              className="shrink-0 text-[11px] font-medium text-[#D4A857] hover:text-[#E0B96B]"
            >
              MAX
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[#8B93A1]">
            <span>Estimated reward token</span>
            <span className="text-[#E8E6E1]">
              {formatEth(estimatedReward)} svRWD
            </span>
          </div>

          <div className="mt-4">
            {isWrongNetwork ? (
              <button
                onClick={() => switchChain({ chainId: STAKING_VAULT_CHAIN.id })}
                disabled={isSwitching}
                className="w-full rounded-xl bg-[#E2725B]/90 py-2.5 text-sm font-semibold text-[#12161D] transition-colors hover:bg-[#E2725B] disabled:opacity-60"
              >
                {isSwitching ? "Switching Network…" : "Switch to Sepolia Testnet"}
              </button>
            ) : (
              <button
                onClick={handleWithdraw}
                disabled={!isValidWithdraw || isPending || isConfirming}
                className="w-full rounded-xl bg-white/[0.08] py-2.5 text-sm font-semibold text-[#E8E6E1] transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending
                  ? "Waiting Signature…"
                  : isConfirming
                    ? "Transaction Confirming…"
                    : `Withdraw From Lot #${lotId}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { parseEther } from "viem";
import { ConnectKitButton } from "connectkit";
import {
  REWARD_TIERS,
  STAKING_VAULT_ABI,
  STAKING_VAULT_ADDRESS,
  STAKING_VAULT_CHAIN,
  parseContractError,
} from "@/lib/contract";
import { useToast } from "@/lib/toast";


const TIER_LADDER = [...REWARD_TIERS].reverse();

function tierPeriodLabel(days: number): string {
  if (days === 0) return "At deposit time";
  const months = days / 30.4;
  if (Math.round(months) % 12 === 0) return `${Math.round(months / 12)} years`;
  return `${Math.round(months)} months`;
}

export function DepositCard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const toast = useToast();

  const [amount, setAmount] = useState("");

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

  const isWrongNetwork = isConnected && chainId !== STAKING_VAULT_CHAIN.id;

  const parsedAmount = useMemo(() => {
    const value = Number(amount);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [amount]);

  useEffect(() => {
    if (isSuccess) {
      toast.success(
        "Deposit successful",
        `${amount} ETH is now locked in a new lot.`,
      );
      setAmount("");
      reset();
    }
   
  }, [isSuccess]);

  useEffect(() => {
    const err = writeError ?? receiptError;
    if (err) toast.error("Deposit failed", parseContractError(err));
   
  }, [writeError, receiptError]);

  function handleDeposit() {
    if (!parsedAmount) return;
    writeContract({
      address: STAKING_VAULT_ADDRESS,
      abi: STAKING_VAULT_ABI,
      functionName: "deposit",
      value: parseEther(amount),
    });
  }

  const buttonLabel = isPending
    ? "Waiting…"
    : isConfirming
      ? "Confirming…"
      : "Deposit ETH";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-7 shadow-2xl shadow-black/30 backdrop-blur-2xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#D4A857]/10 blur-3xl" />

      <div className="relative">
        <h2 className="text-lg font-semibold tracking-tight text-[#E8E6E1]">
          make a deposit
        </h2>
        <p className="mt-1 text-sm text-[#8B93A1]">
          ETH that you deposit will start accruing age as soon as this transaction
          is confirmed on the blockchain.
        </p>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-medium text-[#8B93A1]">
            Amount ETH
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3.5 transition-colors focus-within:border-[#D4A857]/40">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending || isConfirming}
              className="w-full bg-transparent text-2xl font-light text-[#E8E6E1] outline-none placeholder:text-[#4A5160] disabled:opacity-50"
            />
            <span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-sm font-medium text-[#E8E6E1]">
              ETH
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm">
          <span className="text-[#8B93A1]">You will receive</span>
          <span className="font-medium text-[#E8E6E1]">
            {parsedAmount ? amount : "0"} svETH{" "}
            <span className="text-[#8B93A1]">(1:1)</span>
          </span>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs font-medium text-[#8B93A1]">
            Reward Multiplier Schedule
          </p>
          <div className="flex items-end gap-1.5">
            {TIER_LADDER.map((tier) => (
              <div key={tier.bps} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${16 + (tier.bps / 400) * 34}px`,
                    backgroundColor: tier.color,
                    opacity: tier.bps === 0 ? 0.35 : 0.85,
                  }}
                />
                <span className="text-[10px] leading-none text-[#8B93A1]">
                  {tier.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-[#5B6472]">
            <span>{tierPeriodLabel(0)}</span>
            <span>{tierPeriodLabel(1098)}</span>
          </div>
        </div>

        <div className="mt-7">
          {!isConnected ? (
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button
                  onClick={show}
                  className="w-full rounded-2xl bg-[#D4A857] py-3.5 text-sm font-semibold text-[#12161D] transition-colors hover:bg-[#E0B96B]"
                >
                  Connect Wallet
                </button>
              )}
            </ConnectKitButton.Custom>
          ) : isWrongNetwork ? (
            <button
              onClick={() => switchChain({ chainId: STAKING_VAULT_CHAIN.id })}
              disabled={isSwitching}
              className="w-full rounded-2xl bg-[#E2725B]/90 py-3.5 text-sm font-semibold text-[#12161D] transition-colors hover:bg-[#E2725B] disabled:opacity-60"
            >
              {isSwitching ? "Switching networks…" : "Switch to Sepolia Testnet"}
            </button>
          ) : (
            <button
              onClick={handleDeposit}
              disabled={!parsedAmount || isPending || isConfirming}
              className="w-full rounded-2xl bg-[#D4A857] py-3.5 text-sm font-semibold text-[#12161D] transition-colors hover:bg-[#E0B96B] disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-[#5B6472]"
            >
              {buttonLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

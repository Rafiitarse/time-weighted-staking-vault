"use client";

/**
 * The deposit form: ETH in, a Conviction Position (CVP) NFT out. The form is
 * semantic; the amount is a text input with a numeric keyboard (never
 * type=number); validation happens on blur and on submit, never per
 * keystroke; the submit button is disabled only after a valid submission is
 * in flight — closed states (paused, distributor unconfigured) replace the
 * button with their own notice instead.
 */
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { useState } from "react";
import { useDeployment } from "@/lib/deployment-context";
import { ABIS, explorerBaseUrl, vaultAddress, ZERO } from "@/lib/contracts";
import { exactWei, formatToken } from "@/lib/format";
import { useToast } from "@/lib/toast";
import { TxButton } from "@/components/ui/TxButton";
import { WarningBanner } from "@/components/ui/WarningBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConnectButton } from "@/components/ConnectButton";

export function DepositCard() {
  const { chainId, metadata } = useDeployment();
  const account = useAccount();
  const walletChainId = useChainId();
  const { writeContractAsync } = useWriteContract();
  const toast = useToast();

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const vault = vaultAddress(metadata);
  const wrongChain = account.isConnected && walletChainId !== chainId;

  const paused = useReadContract({
    address: vault,
    abi: ABIS.vault,
    functionName: "paused",
    chainId,
    query: { enabled: !!account.address },
  });
  const distributor = useReadContract({
    address: vault,
    abi: ABIS.vault,
    functionName: "rewardDistributor",
    chainId,
    query: { enabled: !!account.address },
  });

  const pausedOn = paused.data === true;
  const configured = distributor.data !== undefined && distributor.data !== ZERO;

  // The exact-wei preview only renders when the input parses cleanly.
  let amountWei: bigint | null = null;
  try {
    if (amount.trim() !== "") amountWei = parseEther(amount.replace(",", ".") as `${number}`);
  } catch {
    amountWei = null;
  }

  function validateAmount(): string | null {
    if (wrongChain) return `Switch your wallet to ${metadata.network} (chain ${chainId}) first.`;
    if (paused.isError || distributor.isError) return "Vault status could not be verified. Try again later.";
    if (paused.isLoading || distributor.isLoading) return "Wait for the vault status to load.";
    if (pausedOn) return "New deposits are currently paused.";
    if (!configured) return "The reward distributor has not been configured.";
    if (amount.trim() === "") return "Enter an amount in ETH.";
    if (amountWei === null) return "That is not a valid ETH amount.";
    if (amountWei <= 0n) return "Amount must be greater than zero.";
    return null;
  }

  function send(): Promise<`0x${string}`> {
    // The ABIs are untyped (readonly unknown[]), so wagmi cannot infer the
    // payable value or args shape; the whole parameter object is cast and
    // verified against the ABI by the live chain reads.
    return writeContractAsync({
      address: vault,
      abi: ABIS.vault,
      functionName: "deposit",
      value: amountWei as bigint,
      chainId,
    } as never);
  }

  function onConfirmed(hash: `0x${string}`, receipt: unknown) {
    toast.success("Deposit confirmed", `Position opened — transaction ${hash.slice(0, 10)}…`);
    void receipt;
  }

  const closedNotice =
    paused.isLoading || distributor.isLoading ? null : paused.isError || distributor.isError ? (
      <WarningBanner tone="warning" title="Vault status unavailable">
        The app could not verify whether deposits are open or whether the reward pool is configured. Try again later.
      </WarningBanner>
    ) : pausedOn ? (
      <WarningBanner tone="warning" title="Deposits are paused">
        A guardian paused deposits. Existing positions are unaffected — you can still withdraw.
      </WarningBanner>
    ) : !configured ? (
      <WarningBanner tone="warning" title="Deposits are closed">
        The vault has no reward distributor linked yet, so it refuses deposits. This is
        separate from a guardian pause.
      </WarningBanner>
    ) : null;

  return (
    <section aria-labelledby="deposit-heading" className="rounded-md border border-border bg-surface p-5">
      <h2 id="deposit-heading" className="text-sm font-semibold tracking-tight">
        Deposit ETH
      </h2>
      <p className="mt-1 text-[13px] text-ink-muted">
        Each deposit opens one Conviction Position. Withdraw any time; the one-time maturity
        bonus on withdrawn principal, paid in CVR, grows with position age.
      </p>

      {!account.isConnected ? (
        <div className="mt-4 flex flex-col gap-3">
          <EmptyState title="Connect a wallet to deposit">Nothing is sent before you confirm in your wallet.</EmptyState>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : closedNotice ? (
        <div className="mt-4">{closedNotice}</div>
      ) : (
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-4 flex flex-col gap-3"
          noValidate
        >
          <label htmlFor="deposit-amount" className="text-xs font-medium text-ink-muted">
            Amount (ETH)
          </label>
          <div className="relative">
            <input
              id="deposit-amount"
              name="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => {
                if (amount.trim() !== "" || error) setError(validateAmount());
              }}
              aria-invalid={error !== null}
              aria-describedby={error ? "deposit-amount-error" : undefined}
              className={`h-10 w-full rounded-md border bg-surface-raised px-3 pr-12 text-sm text-ink transition-colors outline-none focus:border-accent ${
                error ? "border-danger" : "border-border"
              }`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">
              ETH
            </span>
          </div>
          {error ? (
            <p id="deposit-amount-error" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
          {amountWei !== null ? (
            <p className="num text-xs text-ink-faint">
              = {exactWei(amountWei)} wei ({formatToken(amountWei)} ETH)
            </p>
          ) : null}

          {wrongChain ? (
            <WarningBanner tone="info" title="Wallet on another chain">
              Switch your wallet to {metadata.network} (chain {chainId}) using the banner at
              the top, then deposit.
            </WarningBanner>
          ) : null}

          <TxButton
            label={amountWei !== null ? `Deposit ${formatToken(amountWei)} ETH` : "Deposit"}
            send={send}
            system="conviction"
            validate={validateAmount}
            type="submit"
            explorerBaseUrl={explorerBaseUrl(metadata)}
            onConfirmed={onConfirmed}
            className="mt-1 w-full [&>button]:w-full"
          />
          {error ? null : (
            <p className="text-xs text-ink-faint">
              Your wallet shows the exact amount before you confirm. If the vault later
              refuses the deposit (it reverts), nothing moves.
            </p>
          )}        </form>
      )}
    </section>
  );
}

"use client";

/**
 * The one status strip, rendered on every page: deposits open / paused,
 * distributor configured yes/no, the live CVR pool balance, and the admin
 * handover state — plus the chain context (deployment network, wallet
 * chain). Every read is pinned to the deployment chain via `chainId`, so
 * values stay truthful even when the wallet is connected elsewhere; the
 * wrong-chain prompt tells the user to switch instead of showing blanks.
 */
import { useAccount, useChainId, useReadContract, useSwitchChain } from "wagmi";
import { useDeployment } from "@/lib/deployment-context";
import { ABIS, distributorAddress, vaultAddress } from "@/lib/contracts";
import { ZERO } from "@/lib/contracts";
import { formatToken } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";

export function StatusStrip() {
  const { chainId, metadata } = useDeployment();
  const account = useAccount();
  const walletChainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongChain = account.isConnected && walletChainId !== chainId;

  const vault = vaultAddress(metadata);
  const distributor = distributorAddress(metadata);

  const paused = useReadContract({
    address: vault,
    abi: ABIS.vault,
    functionName: "paused",
    chainId,
    query: { enabled: !wrongChain },
  });

  const distributorAddr = useReadContract({
    address: vault,
    abi: ABIS.vault,
    functionName: "rewardDistributor",
    chainId,
    query: { enabled: wrongChain === false },
  });

  const configured = distributorAddr.data !== undefined && distributorAddr.data !== ZERO;

  const available = useReadContract({
    address: distributor,
    abi: ABIS.distributor,
    functionName: "availableRewards",
    chainId,
    query: { enabled: configured && !wrongChain },
  });

  const pendingAdmin = useReadContract({
    address: vault,
    abi: ABIS.vault,
    functionName: "pendingDefaultAdmin",
    chainId,
    query: { enabled: !wrongChain },
  });

  // ABIS are untyped (readonly unknown[]), so decoded reads come back as
  // unknown and are narrowed by hand against the verified ABI shapes.
  const pendingTuple = pendingAdmin.data as [string, bigint] | undefined;
  const handover =
    pendingTuple && pendingTuple[0] !== ZERO
      ? { newAdmin: pendingTuple[0], schedule: Number(pendingTuple[1]) }
      : null;

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1.5 px-6 py-2 text-xs">
        <span className="num text-ink-muted">
          {metadata.network} · chain {chainId}
        </span>

        {wrongChain ? (
          <button
            type="button"
            onClick={() => switchChain({ chainId })}
            className="rounded-sm border border-warning/40 bg-warning/10 px-2 py-0.5 font-medium text-warning transition-colors hover:bg-warning/20"
          >
            {switching ? "Switching…" : "Wrong chain in wallet — switch to continue"}
          </button>
        ) : (
          <>
            {paused.isLoading ? (
              <StatusPill tone="neutral">Deposits —</StatusPill>
            ) : paused.isError ? (
              <StatusPill tone="warn">Deposit status unavailable</StatusPill>
            ) : paused.data ? (
              <StatusPill tone="paused">Deposits paused</StatusPill>
            ) : (
              <StatusPill tone="open">Deposits open</StatusPill>
            )}

            {distributorAddr.isLoading ? (
              <StatusPill tone="neutral">Distributor —</StatusPill>
            ) : distributorAddr.isError ? (
              <StatusPill tone="warn">Distributor status unavailable</StatusPill>
            ) : configured ? (
              <StatusPill tone="open">Distributor configured</StatusPill>
            ) : (
              <StatusPill tone="warn">Distributor not configured</StatusPill>
            )}

            {configured && available.isError ? <StatusPill tone="warn">CVR pool unavailable</StatusPill> : null}
            {configured && available.data !== undefined ? (
              <span className="text-ink-muted">
                Reward pool:{" "}
                <span className="num text-ink">
                  {formatToken(available.data as bigint)} CVR
                </span>
                <span className="ml-1 text-ink-faint">
                  (CVR has no redemption value, revenue share, or governance rights.)
                </span>
              </span>
            ) : null}

            {handover ? <StatusPill tone="pending">Admin handover pending</StatusPill> : null}
          </>
        )}
      </div>
    </div>
  );
}

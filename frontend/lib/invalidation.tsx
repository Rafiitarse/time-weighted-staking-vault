"use client";

/**
 * The one bridge between chain events and the query cache: any vault event
 * (deposit, withdrawal, reward payout/skip, NFT transfer, distributor
 * configuration) invalidates every contract read and the positions query,
 * so stale positions re-read ownerOf and lists refresh without a reload.
 *
 * Reads are pinned to the deployment chain via the `chainId` parameter, and
 * the watch is too — events from the wallet's chain never touch this app's
 * cache.
 */
import { useCallback } from "react";
import { useWatchContractEvent } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useDeployment } from "@/lib/deployment-context";
import { ABIS, vaultAddress } from "@/lib/contracts";

export function VaultEventBridge() {
  const { chainId, metadata } = useDeployment();
  const queryClient = useQueryClient();

  const onLogs = useCallback(() => {
    // wagmi read-hook query keys start with "readContract"; the positions
    // query is ours. Everything else (wallet balances etc.) is untouched.
    void queryClient.invalidateQueries({ queryKey: ["readContract"] });
    void queryClient.invalidateQueries({ queryKey: ["positions", chainId] });
  }, [queryClient, chainId]);

  const vault = vaultAddress(metadata);

  // One hook per event (rules-of-hooks forbids hooks in loops); the hook
  // list is static so the order is stable across renders.
  useWatchContractEvent({ address: vault, abi: ABIS.vault, chainId, eventName: "Deposited", onLogs });
  useWatchContractEvent({ address: vault, abi: ABIS.vault, chainId, eventName: "Withdrawn", onLogs });
  useWatchContractEvent({ address: vault, abi: ABIS.vault, chainId, eventName: "RewardPaid", onLogs });
  useWatchContractEvent({ address: vault, abi: ABIS.vault, chainId, eventName: "RewardSkipped", onLogs });
  useWatchContractEvent({ address: vault, abi: ABIS.vault, chainId, eventName: "Transfer", onLogs });
  useWatchContractEvent({ address: vault, abi: ABIS.vault, chainId, eventName: "RewardDistributorSet", onLogs });

  return null;
}

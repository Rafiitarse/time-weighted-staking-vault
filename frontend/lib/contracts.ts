/**
 * Contract client plumbing. Addresses come from deployment metadata only —
 * never literals. viem public clients are built directly from the metadata
 * here (no wagmi import at the lib layer); wagmi config is consumed by
 * components and hooks, and this module stays usable from server code.
 */
import type { Address, PublicClient } from "viem";
import { createPublicClient, http } from "viem";
import { anvil, sepolia } from "viem/chains";
import type { DeploymentMetadata } from "@/lib/metadata";
import convictionVaultAbi from "@/abis/conviction-vault.json";
import convictionRewardsAbi from "@/abis/conviction-rewards.json";
import rewardDistributorAbi from "@/abis/reward-distributor.json";

export const ABIS = {
  vault: convictionVaultAbi.abi as readonly unknown[],
  cvr: convictionRewardsAbi.abi as readonly unknown[],
  distributor: rewardDistributorAbi.abi as readonly unknown[],
} as const;

const CHAINS = { anvil, sepolia } as const;
const RPC_URLS: Record<string, string> = {
  anvil: "http://127.0.0.1:8545",
};

/** A public client for the metadata's chain (no wallet, read-only). */
export function getPublicClient(metadata: DeploymentMetadata): PublicClient {
  const chain = CHAINS[metadata.network as keyof typeof CHAINS] ?? anvil;
  const transport = http(RPC_URLS[metadata.network] ?? undefined);
  return createPublicClient({ chain, transport });
}

export const vaultAddress = (metadata: DeploymentMetadata): Address =>
  getAddressLike(metadata.contracts.convictionVault);

export const cvrAddress = (metadata: DeploymentMetadata): Address =>
  getAddressLike(metadata.contracts.convictionRewards);

export const distributorAddress = (metadata: DeploymentMetadata): Address =>
  getAddressLike(metadata.contracts.rewardDistributor);

function getAddressLike(value: string): Address {
  return value as Address; // metadata validation already enforced checksummed
}

/* Read helpers shared by the status strip and the admin console. */

export async function readDistributorConfigured(
  client: PublicClient,
  metadata: DeploymentMetadata,
): Promise<boolean> {
  const value = await client.readContract({
    address: vaultAddress(metadata),
    abi: ABIS.vault,
    functionName: "rewardDistributor",
  });
  return (value as Address) !== ZERO;
}

export const ZERO: Address = "0x0000000000000000000000000000000000000000";

/** Explorer base URL for the deployment's network; undefined when none (Anvil). */
const EXPLORERS: Record<string, string> = {
  sepolia: "https://sepolia.etherscan.io",
};
export function explorerBaseUrl(metadata: DeploymentMetadata): string | undefined {
  return EXPLORERS[metadata.network];
}

export async function readAvailableRewards(
  client: PublicClient,
  metadata: DeploymentMetadata,
): Promise<bigint> {
  return (await client.readContract({
    address: distributorAddress(metadata),
    abi: ABIS.distributor,
    functionName: "availableRewards",
  })) as bigint;
}

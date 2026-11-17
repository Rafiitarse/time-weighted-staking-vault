/**
 * Legacy StakingVault surface (Sepolia). Reads the chain directly from the
 * legacy deployment metadata. No Conviction vocabulary leaks here.
 */
import type { Address, PublicClient } from "viem";
import legacyStakingVaultAbi from "@/abis/legacy-staking-vault.json";
import type { LegacyDeploymentMetadata } from "@/lib/metadata";

const ABI = legacyStakingVaultAbi.abi as readonly unknown[];

export interface LegacyLot {
  /** The lot's index in the owner's array; used as the withdrawal id. */
  lotId: number;
  amount: bigint;
  depositedAt: bigint;
}

export const legacyVaultAddress = (metadata: LegacyDeploymentMetadata): Address =>
  metadata.contracts.stakingVault as Address;

export async function getLegacyLots(
  client: PublicClient,
  metadata: LegacyDeploymentMetadata,
  owner: Address,
): Promise<LegacyLot[]> {
  const lots = (await client.readContract({
    address: legacyVaultAddress(metadata),
    abi: ABI,
    functionName: "getUserLots",
    args: [owner],
  })) as Array<{ amount: bigint; timestamp: bigint }>;

  return lots.map((lot, index) => ({
    lotId: index,
    amount: lot.amount,
    depositedAt: lot.timestamp,
  }));
}

/**
 * Extracts the product-meaningful outcome of a transaction receipt against
 * the Conviction contracts: what was minted, what was withdrawn, and what
 * happened to the CVR bonus. Zero-CVR withdrawals are normal outcomes, not
 * failures — reason labels come from the contract's RewardSkippedReason enum.
 */
import type { Address, Log } from "viem";
import { decodeEventLog } from "viem";
import convictionVaultAbi from "@/abis/conviction-vault.json";

export type RewardSkippedReason = 0 | 1;

/** Product language for the contract's RewardSkippedReason enum values. */
export const SKIPPED_REASON_LABELS: Record<RewardSkippedReason, string> = {
  0: "Reward pool insufficient",
  1: "Distributor call failed",
};

export interface RewardPaidEvent {
  tokenId: bigint;
  amount: bigint;
  multiplier: bigint;
}

export interface RewardSkippedEvent {
  tokenId: bigint;
  requestedAmount: bigint;
  reason: RewardSkippedReason;
  reasonLabel: string;
}

export interface WithdrawnEvent {
  tokenId: bigint;
  amount: bigint;
}

export interface ConvictionReceipt {
  /** CVP tokenId minted by this receipt, when it created a position. */
  mintedTokenId: bigint | null;
  rewardsPaid: RewardPaidEvent[];
  rewardsSkipped: RewardSkippedEvent[];
  withdrawn: WithdrawnEvent[];
}

type VaultEventNames =
  | "Deposited"
  | "Withdrawn"
  | "RewardPaid"
  | "RewardSkipped"
  | "RewardDistributorSet"
  | "Transfer";

const abi = convictionVaultAbi.abi as readonly unknown[];

export function parseConvictionReceipt(receipt: { logs: readonly Log[] }, vault: Address): ConvictionReceipt {
  const parsed: ConvictionReceipt = {
    mintedTokenId: null,
    rewardsPaid: [],
    rewardsSkipped: [],
    withdrawn: [],
  };

  for (const logItem of receipt.logs) {
    // Only events the vault itself emitted count; the topic hashes and
    // argument shapes come straight from the synced ABI.
    if (logItem.address.toLowerCase() !== vault.toLowerCase()) continue;

    let decoded: ReturnType<typeof decodeEventLog>;
    try {
      decoded = decodeEventLog({ abi, data: logItem.data, topics: logItem.topics });
    } catch {
      continue; // anonymous or foreign signature; not a vault event we track
    }

    if (!("eventName" in decoded) || decoded.eventName === undefined) continue;
    const name = decoded.eventName as VaultEventNames;
    const args = "args" in decoded ? (decoded.args as Record<string, unknown>) : {};

    switch (name) {
      case "Deposited":
        if (typeof args.tokenId === "bigint" && parsed.mintedTokenId === null) {
          parsed.mintedTokenId = args.tokenId;
        }
        break;
      case "Transfer": {
        // A mint has the zero address as `from` (viem decodes indexed topics
        // to strings, never null).
        const isMint = args.from === null || args.from === "0x0000000000000000000000000000000000000000";
        if (isMint && typeof args.tokenId === "bigint") {
          parsed.mintedTokenId = args.tokenId;
        }
        break;
      }
      case "Withdrawn": {
        parsed.withdrawn.push({
          tokenId: BigInt(args.tokenId as bigint | number),
          amount: BigInt(args.amount as bigint | number),
        });
        break;
      }
      case "RewardPaid": {
        parsed.rewardsPaid.push({
          tokenId: BigInt(args.tokenId as bigint | number),
          amount: BigInt(args.amount as bigint | number),
          multiplier: BigInt(args.multiplier as bigint | number),
        });
        break;
      }
      case "RewardSkipped": {
        // viem decodes uint8 as a number, so normalize through Number().
        const reason = Number(args.reason ?? 0) === 1 ? 1 : 0;
        parsed.rewardsSkipped.push({
          tokenId: BigInt(args.tokenId as bigint | number),
          requestedAmount: BigInt(args.requestedAmount as bigint | number),
          reason,
          reasonLabel: SKIPPED_REASON_LABELS[reason],
        });
        break;
      }
      case "RewardDistributorSet":
        // Consumed through the status strip; receipts do not need it today.
        break;
    }
  }

  return parsed;
}

import { BaseError, ContractFunctionRevertedError } from "viem";
import { sepolia } from "wagmi/chains";

/**
 * StakingVault — Sepolia Testnet
 */
export const STAKING_VAULT_ADDRESS =
  "0x4EbF2EE5753F729F1D8C166BA36783eD35ab48Bf" as const;

export const STAKING_VAULT_CHAIN = sepolia;

export const STAKING_VAULT_ABI = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getUserLots",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct StakingVault.DepositLot[]",
        components: [
          { name: "amount", type: "uint128", internalType: "uint128" },
          { name: "timestamp", type: "uint64", internalType: "uint64" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "receiptToken",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract ITokenMintable" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "rewardToken",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract ITokenMintable" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setTokens",
    inputs: [
      { name: "_receiptToken", type: "address", internalType: "address" },
      { name: "_rewardToken", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "userLots",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "amount", type: "uint128", internalType: "uint128" },
      { name: "timestamp", type: "uint64", internalType: "uint64" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdrawFromLot",
    inputs: [
      { name: "lotId", type: "uint256", internalType: "uint256" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      { name: "lotId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true, internalType: "address" },
      { name: "newOwner", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Paused",
    inputs: [{ name: "account", type: "address", indexed: false, internalType: "address" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokensSet",
    inputs: [
      { name: "receiptToken", type: "address", indexed: true, internalType: "address" },
      { name: "rewardToken", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: [{ name: "account", type: "address", indexed: false, internalType: "address" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      { name: "lotId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "rewardAmount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  { type: "error", name: "EnforcedPause", inputs: [] },
  { type: "error", name: "ExpectedPause", inputs: [] },
  { type: "error", name: "InsufficientLotAmount", inputs: [] },
  { type: "error", name: "InsufficientReceiptBalance", inputs: [] },
  { type: "error", name: "InvalidLotId", inputs: [] },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
  { type: "error", name: "TokensAlreadySet", inputs: [] },
  { type: "error", name: "TokensNotSet", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
  { type: "error", name: "ZeroAmount", inputs: [] },
] as const;

export interface DepositLot {
  amount: bigint;
  timestamp: bigint;
}

export interface RewardTier {
  /** Minimum lot age (in days) required to unlock this tier. */
  minDays: number;
  /** Basis points out of 1000, mirrors the contract's fraction (150/1000 = 15%). */
  bps: number;
  label: string;
  color: string;
}

/**
 * Reward tiers per the StakingVault multiplier schedule, ordered from the
 * longest lock duration down to "just deposited". Used both for the
 * client-side preview and for reading the on-chain result consistently.
 */
export const REWARD_TIERS: RewardTier[] = [
  { minDays: 1098, bps: 400, label: "40%", color: "#F0CE7D" },
  { minDays: 915, bps: 350, label: "35%", color: "#E0B96B" },
  { minDays: 732, bps: 300, label: "30%", color: "#D4A857" },
  { minDays: 549, bps: 250, label: "25%", color: "#BE8B3B" },
  { minDays: 366, bps: 200, label: "20%", color: "#A47D3D" },
  { minDays: 183, bps: 150, label: "15%", color: "#8B6F3E" },
  { minDays: 0, bps: 0, label: "0%", color: "#5B6472" },
];

/** Returns the highest tier a lot of the given age (in days) currently qualifies for. */
export function getMultiplierForAge(ageDays: number): RewardTier {
  return (
    REWARD_TIERS.find((tier) => ageDays >= tier.minDays) ??
    REWARD_TIERS[REWARD_TIERS.length - 1]
  );
}

/** Returns the next tier a lot has not yet reached, or null if already at the max tier. */
export function getNextTier(ageDays: number): RewardTier | null {
  const ascending = [...REWARD_TIERS].reverse();
  return ascending.find((tier) => tier.minDays > ageDays) ?? null;
}

const REVERT_MESSAGES: Record<string, string> = {
  EnforcedPause: "Vault is currently paused by the admin. Please try again later.",
  ExpectedPause: "This action can only be performed when the vault is in a paused state.",
  InsufficientLotAmount: "The withdrawal amount exceeds the remaining balance in this lot.",
  InsufficientReceiptBalance: "Your Receipt Token balance is insufficient for this transaction.",
  InvalidLotId: "The selected lot is invalid or no longer exists.",
  TransferFailed: "Failed to process ETH transfer from the vault.",
  ZeroAmount: "The transaction amount cannot be zero.",
  TokensNotSet: "Tokens have not been configured by the vault admin.",
  TokensAlreadySet: "Tokens have already been configured.",
  ReentrancyGuardReentrantCall: "Transaction detected as reentrant and cancelled for security.",
};

/**
 * Turns a wagmi/viem write or receipt error into a short, human-readable
 * message — including decoding custom Solidity errors reverted by the vault.
 */
export function parseContractError(error: unknown): string {
  if (!error) return "An unknown error occurred.";

  if (error instanceof BaseError) {
    const revertError = error.walk(
      (e) => e instanceof ContractFunctionRevertedError,
    );

    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName ?? "";
      return (
        REVERT_MESSAGES[errorName] ??
        revertError.shortMessage ??
        "Transaction rejected by smart contract."
      );
    }

    if (error.shortMessage?.toLowerCase().includes("user rejected")) {
      return "Transaction cancelled from MetaMask.";
    }

    return error.shortMessage || error.message || "Transaction failed to process.";
  }

  if (error instanceof Error) return error.message;
  return "An unexpected error occurred. Please try again.";
}

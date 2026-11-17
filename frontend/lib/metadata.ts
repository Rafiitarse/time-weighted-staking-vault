/**
 * Deployment metadata is the single source of truth for contract addresses
 * (emitted by contracts/script/DeployConvictionVault.s.sol into
 * deployments/<network>.json). Nothing else in the frontend or subgraph may
 * hard-code a contract address; CI enforces this.
 *
 * Client-safe: types + validation only. The server-side fs loader lives in
 * lib/load-deployment.ts so client bundles never pull node:fs.
 */
import { getAddress } from "viem";

export interface DeploymentContracts {
  convictionVault: string;
  convictionRewards: string;
  rewardDistributor: string;
}

export interface DeploymentMetadata {
  network: string;
  chainId: number;
  contracts: DeploymentContracts;
  treasury: string;
  safeAdmin: string;
  guardian: string;
  guardianIsSafe: boolean;
  startBlock: number;
  depositsEnabled: boolean;
  /** Block timestamp of the head after deployment; informational only. */
  deployedAtBlockTimestamp: number;
  /** Optional Safe Transaction Service URL; absent → admin console fallback mode. */
  safeTransactionService?: string;
}

export interface LegacyDeploymentMetadata {
  network: string;
  chainId: number;
  system: "legacy";
  contracts: { stakingVault: string };
  startBlock: number;
  graphql: { endpoint: string };
}

/** Validate the separately deployed legacy Sepolia system; never infer its address. */
export function validateLegacyDeploymentMetadata(data: unknown): LegacyDeploymentMetadata {
  if (typeof data !== "object" || data === null) throw new Error("legacy deployment metadata: file is not an object");
  const chainId = readAt(data, ["chainId"]);
  if (chainId !== 11155111 || readAt(data, ["network"]) !== "sepolia" || readAt(data, ["system"]) !== "legacy") {
    throw new Error("legacy deployment metadata: expected the legacy Sepolia deployment");
  }
  const stakingVault = requireAddress(data, ["contracts", "stakingVault"], "contracts.stakingVault");
  const startBlock = readAt(data, ["startBlock"]);
  if (typeof startBlock !== "number" || !Number.isSafeInteger(startBlock) || startBlock < 0) {
    throw new Error("legacy deployment metadata: startBlock must be a non-negative integer");
  }
  const endpoint = readAt(data, ["graphql", "endpoint"]);
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    throw new Error("legacy deployment metadata: Graph endpoint must use HTTPS");
  }
  return { network: "sepolia", chainId, system: "legacy", contracts: { stakingVault }, startBlock, graphql: { endpoint } };
}

const ADDRESS_KEYS: ReadonlyArray<{ path: string[]; label: string }> = [
  { path: ["contracts", "convictionVault"], label: "contracts.convictionVault" },
  { path: ["contracts", "convictionRewards"], label: "contracts.convictionRewards" },
  { path: ["contracts", "rewardDistributor"], label: "contracts.rewardDistributor" },
  { path: ["treasury"], label: "treasury" },
  { path: ["safeAdmin"], label: "safeAdmin" },
  { path: ["guardian"], label: "guardian" },
];

function readAt(data: unknown, path: string[]): unknown {
  let node: unknown = data;
  for (const key of path) {
    if (typeof node !== "object" || node === null || !(key in node)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/** Throws unless the value is a checksummed address (viem's getAddress). */
function requireAddress(data: unknown, path: string[], label: string): string {
  const value = readAt(data, path);
  if (typeof value !== "string") {
    throw new Error(`deployment metadata: missing field ${label}`);
  }
  let checksummed: string;
  try {
    checksummed = getAddress(value);
  } catch {
    throw new Error(`deployment metadata: ${label} is not a valid address`);
  }
  if (checksummed !== value) {
    throw new Error(`deployment metadata: ${label} is not checksummed`);
  }
  return checksummed;
}

/**
 * Validates one Conviction deployment metadata file against the expected
 * chain id. Throws Error with a reason-bearing message (chain / missing
 * field / checksum / startBlock) so the server loader can surface it.
 */
export function validateDeploymentMetadata(data: unknown, expectedChainId: number): DeploymentMetadata {
  if (typeof data !== "object" || data === null) {
    throw new Error("deployment metadata: file is not an object");
  }
  const chainId = readAt(data, ["chainId"]);
  if (chainId !== expectedChainId) {
    throw new Error(
      `deployment metadata: chain mismatch (file says ${String(chainId)}, expected ${expectedChainId})`,
    );
  }
  const network = readAt(data, ["network"]);
  const expectedNetwork = expectedChainId === 31337 ? "anvil" : expectedChainId === 11155111 ? "sepolia" : null;
  if (typeof network !== "string" || (expectedNetwork !== null && network !== expectedNetwork)) {
    throw new Error(`deployment metadata: network mismatch (file says ${String(network)}, expected ${expectedNetwork ?? "a named network"})`);
  }
  for (const { path, label } of ADDRESS_KEYS) {
    requireAddress(data, path, label);
  }
  const startBlock = readAt(data, ["startBlock"]);
  if (typeof startBlock !== "number" || !Number.isInteger(startBlock) || startBlock < 0) {
    throw new Error("deployment metadata: startBlock must be a non-negative integer");
  }

  return {
    network,
    chainId: expectedChainId,
    contracts: {
      convictionVault: requireAddress(data, ["contracts", "convictionVault"], "contracts.convictionVault"),
      convictionRewards: requireAddress(data, ["contracts", "convictionRewards"], "contracts.convictionRewards"),
      rewardDistributor: requireAddress(data, ["contracts", "rewardDistributor"], "contracts.rewardDistributor"),
    },
    treasury: requireAddress(data, ["treasury"], "treasury"),
    safeAdmin: requireAddress(data, ["safeAdmin"], "safeAdmin"),
    guardian: requireAddress(data, ["guardian"], "guardian"),
    guardianIsSafe: readAt(data, ["guardianIsSafe"]) === true,
    startBlock,
    depositsEnabled: readAt(data, ["depositsEnabled"]) === true,
    deployedAtBlockTimestamp: (readAt(data, ["deployedAtBlockTimestamp"]) as number) ?? 0,
    safeTransactionService:
      typeof readAt(data, ["safeTransactionService"]) === "string"
        ? (readAt(data, ["safeTransactionService"]) as string)
        : undefined,
  };
}

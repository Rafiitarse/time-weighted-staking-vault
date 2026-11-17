/**
 * Position discovery: the vault exposes no user index, so positions are
 * found by scanning vault `Transfer` logs from the deployment's startBlock
 * and folding mint/transfer history into a per-address ownership map.
 *
 * The fold is checkpointed in localStorage per (chainId, owner): the last
 * scanned block plus the owner's token map, so repeat visits scan only the
 * new blocks. Corrupt or mismatched checkpoints reset to a full rescan.
 *
 * Pure helpers (foldOwnerMap, checkpoint codec) are exported for tests;
 * discoverPositions is the client-side entry point used by the vault UI.
 */
import type { Address, PublicClient } from "viem";
import type { DeploymentMetadata } from "@/lib/metadata";
import { vaultAddress } from "@/lib/contracts";
import { ZERO } from "@/lib/contracts";

/** Transfer(address indexed from, address indexed to, uint256 indexed tokenId) */
const transferEvent = {
  type: "event",
  name: "Transfer",
  inputs: [
    { type: "address", name: "from", indexed: true },
    { type: "address", name: "to", indexed: true },
    { type: "uint256", name: "tokenId", indexed: true },
  ],
} as const;

/** Blocks per getLogs request — small enough for public RPC range limits. */
const SCAN_CHUNK = 2000n;

const CHECKPOINT_PREFIX = "cv-positions";

export interface DiscoveredPosition {
  tokenId: bigint;
  remainingPrincipal: bigint;
  depositedAt: bigint;
  /** Fresh ownerOf — may differ from the scanned owner (stale position). */
  owner: Address;
  /** Full-withdraw quote from the contract; null when the read failed. */
  quote: { multiplier: bigint; rewardAmount: bigint } | null;
}

/** tokenId (decimal string) → owner address, lowercase-compared. */
export type OwnerMap = Record<string, string>;

/**
 * Folds Transfer logs into the ownership map for one owner: a token arriving
 * to `owner` is added, a token leaving it is removed, everything else is
 * ignored. `from` may be null (viem always decodes indexed topics, but be
 * defensive) — the zero address is the mint sender.
 */
export function foldOwnerMap(
  map: OwnerMap,
  logs: ReadonlyArray<{ args: { from?: string | null; to?: string | null; tokenId?: bigint } }>,
  owner: string,
): OwnerMap {
  const next = { ...map };
  const ownerLower = owner.toLowerCase();
  for (const log of logs) {
    const { from, to, tokenId } = log.args;
    if (tokenId === undefined || !to) continue;
    const toLower = to.toLowerCase();
    const fromLower = (from ?? ZERO).toLowerCase();
    if (toLower === ownerLower) {
      next[tokenId.toString()] = to;
    } else if (fromLower === ownerLower) {
      delete next[tokenId.toString()];
    }
  }
  return next;
}

interface Checkpoint {
  lastBlock: number;
  tokens: OwnerMap;
}

function checkpointKey(chainId: number, owner: string): string {
  return `${CHECKPOINT_PREFIX}:${chainId}:${owner.toLowerCase()}`;
}

function loadCheckpoint(chainId: number, owner: string): Checkpoint {
  const fallback: Checkpoint = { lastBlock: -1, tokens: {} };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(checkpointKey(chainId, owner));
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Checkpoint).lastBlock !== "number" ||
      typeof (parsed as Checkpoint).tokens !== "object" ||
      (parsed as Checkpoint).tokens === null
    ) {
      return fallback;
    }
    return parsed as Checkpoint;
  } catch {
    return fallback;
  }
}

function saveCheckpoint(chainId: number, owner: string, checkpoint: Checkpoint): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(checkpointKey(chainId, owner), JSON.stringify(checkpoint));
  } catch {
    // Storage may be unavailable (private mode, quota); a full rescan on the
    // next visit is the correct degradation, never a crash.
  }
}

/**
 * Discovers the positions of `owner` on the deployment chain. Throws when the
 * chain is unreachable; callers render that as an error state.
 */
export async function discoverPositions(
  client: PublicClient,
  metadata: DeploymentMetadata,
  owner: Address,
): Promise<DiscoveredPosition[]> {
  const vault = vaultAddress(metadata);
  const head = await client.getBlockNumber();
  const start = BigInt(Math.max(metadata.startBlock, 0));

  const checkpoint = loadCheckpoint(metadata.chainId, owner);
  const from = checkpoint.lastBlock >= 0 ? BigInt(checkpoint.lastBlock) + 1n : start;
  let map: OwnerMap = checkpoint.tokens;

  if (from <= head) {
    // Chunked log scan; each chunk folds into the map before persisting.
    for (let chunkStart = from; chunkStart <= head; chunkStart += SCAN_CHUNK) {
      const chunkEnd = chunkStart + SCAN_CHUNK - 1n > head ? head : chunkStart + SCAN_CHUNK - 1n;
      const logs = await client.getLogs({
        address: vault,
        event: transferEvent,
        fromBlock: chunkStart,
        toBlock: chunkEnd,
      });
      map = foldOwnerMap(
        map,
        logs.map((log) => ({ args: log.args as { from?: string | null; to?: string | null; tokenId?: bigint } })),
        owner,
      );
      saveCheckpoint(metadata.chainId, owner, { lastBlock: Number(chunkEnd), tokens: map });
    }
  }

  const tokenIds = Object.keys(map).sort((a, b) => Number(BigInt(a) - BigInt(b)));

  const results = await Promise.all(
    tokenIds.map(async (id) => {
      const tokenId = BigInt(id);
      // Burned tokens (full withdrawal) revert ownerOf; drop them from the
      // map and the result instead of failing the whole discovery.
      let ownerNow: Address;
      try {
        ownerNow = (await client.readContract({
          address: vault,
          abi: [
            {
              type: "function",
              name: "ownerOf",
              stateMutability: "view",
              inputs: [{ type: "uint256", name: "tokenId" }],
              outputs: [{ type: "address", name: "" }],
            },
          ] as const,
          functionName: "ownerOf",
          args: [tokenId],
        })) as Address;
      } catch {
        return null;
      }

      const position = (await client.readContract({
        address: vault,
        abi: [
          {
            type: "function",
            name: "positions",
            stateMutability: "view",
            inputs: [{ type: "uint256", name: "tokenId" }],
            outputs: [
              { type: "uint128", name: "remainingPrincipal" },
              { type: "uint64", name: "depositedAt" },
            ],
          },
        ] as const,
        functionName: "positions",
        args: [tokenId],
      })) as [bigint, bigint];

      let quote: DiscoveredPosition["quote"] = null;
      try {
        const q = (await client.readContract({
          address: vault,
          abi: [
            {
              type: "function",
              name: "quoteReward",
              stateMutability: "view",
              inputs: [
                { type: "uint256", name: "tokenId" },
                { type: "uint256", name: "amount" },
              ],
              outputs: [
                { type: "uint256", name: "multiplier" },
                { type: "uint256", name: "rewardAmount" },
              ],
            },
          ] as const,
          functionName: "quoteReward",
          args: [tokenId, position[0]],
        })) as [bigint, bigint];
        quote = { multiplier: q[0], rewardAmount: q[1] };
      } catch {
        quote = null;
      }

      return {
        tokenId,
        remainingPrincipal: position[0],
        depositedAt: position[1],
        owner: ownerNow,
        quote,
      } satisfies DiscoveredPosition;
    }),
  );

  const positions = results.filter((p): p is DiscoveredPosition => p !== null);

  // Prune burned tokens from the persisted map so the checkpoint stays true.
  if (positions.length !== tokenIds.length) {
    const alive = new Set(positions.map((p) => p.tokenId.toString()));
    const pruned: OwnerMap = {};
    for (const id of tokenIds) {
      if (alive.has(id)) pruned[id] = map[id];
    }
    map = pruned;
  }
  saveCheckpoint(metadata.chainId, owner, { lastBlock: Number(head), tokens: map });

  return positions;
}

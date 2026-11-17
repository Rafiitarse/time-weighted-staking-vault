import {
  encodeAbiParameters,
  encodeEventTopics,
  toEventHash,
  type Abi,
  type AbiEvent,
  type Address,
  type Log,
} from "viem";
import { describe, expect, it } from "vitest";
import { parseConvictionReceipt, SKIPPED_REASON_LABELS } from "@/lib/receipt";
import convictionVaultAbi from "@/abis/conviction-vault.json";

const VAULT = "0xdC64a140Aa3E981100a9becA4E685f962f0cF6C9";
const OTHER = "0x3fC4E746022d3dcEF5F534400E713c2bB9886F49";
const OWNER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const TOKEN_ID = 42n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const abi = convictionVaultAbi.abi as Abi;

type EventName = "Deposited" | "Withdrawn" | "RewardPaid" | "RewardSkipped" | "Transfer";

/** The synced ABI's own event item for a name, so fixtures stay in sync. */
function eventItem(name: EventName): AbiEvent {
  const found = abi.find(
    (item): item is AbiEvent => (item as AbiEvent).type === "event" && (item as AbiEvent).name === name,
  );
  if (!found) throw new Error(`missing ${name} in the synced ABI`);
  return found;
}

/** Builds a realistic vault log from the synced ABI's own event types. */
function mkLog(name: EventName, args: Record<string, unknown>, address: Address = VAULT): Log {
  const event = eventItem(name);
  const topics = encodeEventTopics({ abi, eventName: name, args: args as never });
  // Non-indexed arguments serialize in the event's declaration order.
  const params = event.inputs.filter((input) => !input.indexed);
  const data = params.length > 0 ? encodeAbiParameters(params, params.map((p) => args[p.name ?? ""])) : "0x";
  return {
    address,
    topics: topics as Log["topics"],
    data,
    blockNumber: 1n,
    blockHash: null,
    logIndex: null,
    transactionHash: null,
    transactionIndex: null,
    removed: false,
  };
}

describe("SKIPPED_REASON_LABELS", () => {
  it("carries the product language for both reasons", () => {
    expect(SKIPPED_REASON_LABELS[0]).toBe("Reward pool insufficient");
    expect(SKIPPED_REASON_LABELS[1]).toBe("Distributor call failed");
  });
});

describe("parseConvictionReceipt", () => {
  it("extracts the minted tokenId from a deposit receipt", () => {
    const logs = [mkLog("Transfer", { from: ZERO_ADDRESS, to: OWNER, tokenId: TOKEN_ID })];
    const parsed = parseConvictionReceipt({ logs }, VAULT);
    expect(parsed.mintedTokenId).toBe(TOKEN_ID);
  });

  it("extracts RewardPaid amount and multiplier", () => {
    const logs = [
      mkLog("RewardPaid", { owner: OWNER, tokenId: TOKEN_ID, amount: 25_000_000_000_000_000_000n, multiplier: 25n }),
    ];
    const parsed = parseConvictionReceipt({ logs }, VAULT);
    expect(parsed.rewardsPaid).toHaveLength(1);
    expect(parsed.rewardsPaid[0]).toEqual({
      tokenId: TOKEN_ID,
      amount: 25_000_000_000_000_000_000n,
      multiplier: 25n,
    });
  });

  it("maps RewardSkipped reason 0 to the insufficiency label", () => {
    const logs = [
      mkLog("RewardSkipped", { owner: OWNER, tokenId: TOKEN_ID, requestedAmount: 1250n, reason: 0 }),
    ];
    const parsed = parseConvictionReceipt({ logs }, VAULT);
    expect(parsed.rewardsSkipped).toHaveLength(1);
    expect(parsed.rewardsSkipped[0].reason).toBe(0);
    expect(parsed.rewardsSkipped[0].reasonLabel).toBe("Reward pool insufficient");
  });

  it("maps RewardSkipped reason 1 to the distributor-failure label", () => {
    const logs = [
      mkLog("RewardSkipped", { owner: OWNER, tokenId: TOKEN_ID, requestedAmount: 1250n, reason: 1 }),
    ];
    const parsed = parseConvictionReceipt({ logs }, VAULT);
    expect(parsed.rewardsSkipped[0].reasonLabel).toBe("Distributor call failed");
  });

  it("extracts Withdrawn and ignores logs from other contracts", () => {
    const logs = [
      mkLog("Withdrawn", { owner: OWNER, recipient: OWNER, tokenId: TOKEN_ID, amount: 5n }),
      mkLog("Transfer", { from: ZERO_ADDRESS, to: OWNER, tokenId: 99n }, OTHER),
    ];
    const parsed = parseConvictionReceipt({ logs }, VAULT);
    expect(parsed.withdrawn).toHaveLength(1);
    expect(parsed.withdrawn[0].tokenId).toBe(TOKEN_ID);
    expect(parsed.mintedTokenId).toBeNull(); // foreign mint ignored
  });
});

describe("receipt sanity against the synced ABI", () => {
  it("RewardSkipped reason is a uint8 the parser reads as 0/1", () => {
    const topics = encodeEventTopics({
      abi,
      eventName: "RewardSkipped",
      args: { owner: OWNER, tokenId: TOKEN_ID },
    });
    expect(topics[0]).toBe(toEventHash("RewardSkipped(address,uint256,uint256,uint8)"));
  });
});

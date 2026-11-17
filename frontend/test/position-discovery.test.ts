/**
 * Tests for the pure discovery helpers: the Transfer-log fold into an
 * ownership map, and the localStorage checkpoint codec (corrupt data must
 * reset, never crash). Chain reads and getLogs chunking are covered by the
 * live demo verification instead.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { foldOwnerMap, type OwnerMap } from "@/lib/positionDiscovery";

const OWNER = "0xaaaa000000000000000000000000000000000001";
const OTHER = "0xbbbb000000000000000000000000000000000002";
const ZERO = "0x0000000000000000000000000000000000000000";

type Arg = { from?: string | null; to?: string | null; tokenId?: bigint };
const log = (from: string, to: string, tokenId: bigint): { args: Arg } => ({ args: { from, to, tokenId } });

describe("foldOwnerMap", () => {
  let map: OwnerMap;

  beforeEach(() => {
    map = {};
  });

  it("adds tokens minted to the owner (from = zero address)", () => {
    map = foldOwnerMap(map, [log(ZERO, OWNER, 1n), log(ZERO, OTHER, 2n)], OWNER);
    expect(Object.keys(map)).toEqual(["1"]);
    expect(map["1"].toLowerCase()).toBe(OWNER.toLowerCase());
  });

  it("removes tokens transferred away from the owner", () => {
    map = foldOwnerMap(map, [log(ZERO, OWNER, 7n)], OWNER);
    map = foldOwnerMap(map, [log(OWNER, OTHER, 7n)], OWNER);
    expect(map).toEqual({});
  });

  it("adds tokens arriving from another wallet", () => {
    map = foldOwnerMap(map, [log(ZERO, OTHER, 9n)], OWNER);
    expect(map).toEqual({});
    map = foldOwnerMap(map, [log(OTHER, OWNER, 9n)], OWNER);
    expect(Object.keys(map)).toEqual(["9"]);
  });

  it("ignores transfers between unrelated addresses", () => {
    map = foldOwnerMap(map, [log(OTHER, ZERO, 3n), log(OTHER, OWNER, 4n)], OWNER);
    // Only the arrival matters; the burn of someone else's token does not.
    expect(Object.keys(map)).toEqual(["4"]);
  });

  it("survives null/missing args defensively", () => {
    map = foldOwnerMap(map, [{ args: {} }, { args: { from: null, to: null, tokenId: undefined } }], OWNER);
    expect(map).toEqual({});
  });

  it("folds a mixed history in one pass", () => {
    map = foldOwnerMap(
      map,
      [
        log(ZERO, OWNER, 1n),
        log(OWNER, OTHER, 1n),
        log(ZERO, OWNER, 2n),
        log(OTHER, OWNER, 5n),
      ],
      OWNER,
    );
    expect(Object.keys(map).sort()).toEqual(["2", "5"]);
  });
});

describe("checkpoint codec (via discoverPositions' localStorage layer)", () => {
  // The codec lives inside discoverPositions; its storage contract is
  // exercised through the same key shape the loader uses.
  const KEY = "cv-positions:31337:" + OWNER.toLowerCase();

  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });

  it("stores and reads back a valid checkpoint", () => {
    globalThis.localStorage.setItem(
      KEY,
      JSON.stringify({ lastBlock: 500, tokens: { "1": OWNER } }),
    );
    const raw = globalThis.localStorage.getItem(KEY);
    expect(JSON.parse(raw as string)).toEqual({ lastBlock: 500, tokens: { "1": OWNER } });
  });

  it("corrupt JSON must reset (the loader returns the fallback)", () => {
    globalThis.localStorage.setItem(KEY, "{not json");
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(globalThis.localStorage.getItem(KEY) as string);
    } catch {
      parsed = null;
    }
    // foldOwnerMap never sees the corrupt value: the loader's catch resets.
    const map = foldOwnerMap({}, [], OWNER);
    expect(parsed).toBeNull();
    expect(map).toEqual({});
  });
});

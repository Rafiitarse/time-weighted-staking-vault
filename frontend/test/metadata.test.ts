import { describe, expect, it } from "vitest";
import { validateDeploymentMetadata, validateLegacyDeploymentMetadata } from "@/lib/metadata";

const valid = {
  network: "anvil",
  chainId: 31337,
  contracts: {
    convictionVault: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    convictionRewards: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    rewardDistributor: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  },
  treasury: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  safeAdmin: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  guardian: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  guardianIsSafe: false,
  startBlock: 46,
  depositsEnabled: false,
  deployedAtBlockTimestamp: 1794705091,
};

describe("validateDeploymentMetadata", () => {
  it("accepts the deploy-script schema", () => {
    expect(() => validateDeploymentMetadata(valid, 31337)).not.toThrow();
  });

  it("rejects a chain mismatch", () => {
    expect(() => validateDeploymentMetadata(valid, 11155111)).toThrow(/chain/i);
  });

  it("rejects a network label that disagrees with the chain", () => {
    expect(() => validateDeploymentMetadata({ ...valid, network: "sepolia" }, 31337)).toThrow(/network mismatch/i);
  });

  it("rejects missing contract keys", () => {
    const bad = { ...valid, contracts: { ...valid.contracts, rewardDistributor: undefined } };
    expect(() => validateDeploymentMetadata(bad as never, 31337)).toThrow(/rewardDistributor/i);
  });

  it("rejects a non-checksummed address", () => {
    const bad = { ...valid, contracts: { ...valid.contracts, convictionVault: valid.contracts.convictionVault.toLowerCase() } };
    expect(() => validateDeploymentMetadata(bad, 31337)).toThrow(/checksum/i);
  });

  it("rejects a non-address value", () => {
    const bad = { ...valid, contracts: { ...valid.contracts, convictionVault: "not-an-address" } };
    expect(() => validateDeploymentMetadata(bad, 31337)).toThrow();
  });

  it("rejects a negative startBlock", () => {
    const bad = { ...valid, startBlock: -1 };
    expect(() => validateDeploymentMetadata(bad, 31337)).toThrow(/startBlock/i);
  });
});

describe("validateLegacyDeploymentMetadata", () => {
  const legacy = {
    network: "sepolia", chainId: 11155111, system: "legacy",
    contracts: { stakingVault: "0x4EbF2EE5753F729F1D8C166BA36783eD35ab48Bf" },
    startBlock: 11674936,
    graphql: { endpoint: "https://api.studio.thegraph.com/query/1760076/staking-vault/version/latest" },
  };
  it("accepts the canonical legacy metadata shape", () => {
    expect(validateLegacyDeploymentMetadata(legacy).contracts.stakingVault).toBe(legacy.contracts.stakingVault);
  });
  it("rejects another chain, invalid address, and non-HTTPS endpoint", () => {
    expect(() => validateLegacyDeploymentMetadata({ ...legacy, chainId: 1 })).toThrow(/Sepolia/i);
    expect(() => validateLegacyDeploymentMetadata({ ...legacy, contracts: { stakingVault: "0x123" } })).toThrow(/address/i);
    expect(() => validateLegacyDeploymentMetadata({ ...legacy, graphql: { endpoint: "http://example.com" } })).toThrow(/HTTPS/i);
  });
});

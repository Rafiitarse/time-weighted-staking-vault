import { describe, expect, it } from "vitest";
import { parseContractError } from "@/lib/errors";

describe("parseContractError — conviction system", () => {
  it("maps RewardDistributorNotSet with its distinct UI state copy", () => {
    const parsed = parseContractError(
      { name: "ContractFunctionExecutionError", details: "RewardDistributorNotSet()" },
      "conviction",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.detail.toLowerCase()).toContain("distributor");
    expect(parsed!.title.toLowerCase()).not.toContain("paused");
  });

  it("maps every vault custom error to a title", () => {
    const names = [
      "InvalidAddress(address)",
      "AmountExceedsPositionLimit(uint256)",
      "TimestampExceedsPositionLimit(uint256)",
      "RewardDistributorNotSet()",
      "InvalidRewardDistributor(address)",
      "RewardDistributorVaultMismatch(address)",
      "NotPositionOwner(address,uint256)",
      "ZeroAmount()",
      "InsufficientPositionPrincipal(uint256,uint256)",
      "InvalidPositionRecipient(address)",
      "TransferFailed()",
      "DefaultAdminConfigurationImmutable()",
      "ERC721NonexistentToken(uint256)",
      "ERC721IncorrectOwner(address,uint256,address)",
    ];
    for (const selector of names) {
      const parsed = parseContractError(
        { name: "ContractFunctionExecutionError", details: `${selector}(...)` },
        "conviction",
      );
      expect(parsed, selector).not.toBeNull();
      expect(parsed!.detail.length).toBeGreaterThan(0);
    }
  });

  it("keeps raw revert data for unknown errors", () => {
    const parsed = parseContractError(
      { name: "ContractFunctionExecutionError", details: "0xdeadbeef" },
      "conviction",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.detail).toContain("0xdeadbeef");
  });
});

describe("parseContractError — legacy separation", () => {
  it("conviction error names never leak into legacy lookups", () => {
    const parsed = parseContractError(
      { name: "ContractFunctionExecutionError", details: "RewardDistributorNotSet()" },
      "legacy",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.title.toLowerCase()).not.toContain("distributor");
  });

  it("legacy error names never leak into conviction lookups", () => {
    const parsed = parseContractError(
      { name: "ContractFunctionExecutionError", details: "InsufficientLotAmount()" },
      "conviction",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.title.toLowerCase()).not.toContain("lot");
  });

  it("maps a legacy revert string", () => {
    const parsed = parseContractError(
      { name: "ContractFunctionExecutionError", details: "InsufficientLotAmount()" },
      "legacy",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.title.toLowerCase()).toContain("lot");
  });
});

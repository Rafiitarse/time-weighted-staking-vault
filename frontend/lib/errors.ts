/**
 * Human-readable mappings for contract reverts. The conviction and legacy
 * systems are separate vocabularies: a conviction error name must never map
 * through the legacy table and vice versa. Unknown errors keep the raw revert
 * data — never a generic "something went wrong".
 */
// (no viem type imports needed: error mapping is deliberately string-based)

export interface ParsedError {
  title: string;
  detail: string;
}

type ErrorArgs = Record<string, unknown>;

type ErrorSpec = {
  selector: string; // Solidity error signature with parens, e.g. "ZeroAmount()"
  title: string;
  detail: string;
  /** Humanizes a specific argument into the detail string. */
  humanize?: (args: ErrorArgs) => string;
};

const truncateAddr = (a: unknown) =>
  typeof a === "string" && a.startsWith("0x") ? `${a.slice(0, 8)}…${a.slice(-4)}` : String(a);

const CONVICTION_ERRORS: readonly ErrorSpec[] = [
  {
    selector: "RewardDistributorNotSet()",
    title: "Rewards not configured yet",
    detail:
      "The vault has no reward distributor linked yet, so deposits are closed. This is separate from a guardian pause.",
  },
  {
    selector: "ZeroAmount()",
    title: "Amount must be greater than zero",
    detail: "Enter a positive amount.",
  },
  {
    selector: "InvalidAddress(address)",
    title: "Invalid address",
    detail: "The transaction used an address the contract rejects.",
    humanize: (a) => `Address: ${truncateAddr(a.address)}`,
  },
  {
    selector: "InvalidRewardDistributor(address)",
    title: "Distributor already linked",
    detail: "The reward distributor can only be set once.",
    humanize: (a) => `Attempted: ${truncateAddr(a.distributor ?? a[0])}`,
  },
  {
    selector: "RewardDistributorVaultMismatch(address)",
    title: "Distributor bound to another vault",
    detail: "The distributor's vault() does not match this vault.",
    humanize: (a) => `Reported vault: ${truncateAddr(a.actualVault ?? a[0])}`,
  },
  {
    selector: "NotPositionOwner(address,uint256)",
    title: "Not the position owner",
    detail: "Only the current owner of this CVP position can withdraw from it.",
    humanize: (a) => `Position #${String(a.tokenId ?? a[1])}`,
  },
  {
    selector: "InsufficientPositionPrincipal(uint256,uint256)",
    title: "Not enough remaining principal",
    detail: "The withdrawal exceeds what is still staked in this position.",
    humanize: (a) => `Available: ${String(a.available ?? a[0])} wei`,
  },
  {
    selector: "InvalidPositionRecipient(address)",
    title: "Invalid recipient",
    detail: "Withdrawals need a non-zero recipient address.",
    humanize: (a) => `Recipient: ${truncateAddr(a.recipient ?? a[0])}`,
  },
  {
    selector: "TransferFailed()",
    title: "Transfer failed",
    detail: "The contract could not deliver funds. Check the recipient accepts ETH.",
  },
  {
    selector: "AmountExceedsPositionLimit(uint256)",
    title: "Amount exceeds the position limit",
    detail: "Deposit amounts are capped by the contract's storage layout.",
    humanize: (a) => `Requested: ${String(a.amount ?? a[0])} wei`,
  },
  {
    selector: "TimestampExceedsPositionLimit(uint256)",
    title: "Timestamp exceeds the position limit",
    detail: "Chain time is outside the contract's supported range.",
  },
  {
    selector: "DefaultAdminConfigurationImmutable()",
    title: "Admin configuration is immutable",
    detail: "The admin transfer delay and renounce behavior cannot be changed.",
  },
  {
    selector: "ERC721NonexistentToken(uint256)",
    title: "Position does not exist",
    detail: "There is no CVP position with that id.",
    humanize: (a) => `Position #${String(a.tokenId ?? a[0])}`,
  },
  {
    selector: "ERC721IncorrectOwner(address,uint256,address)",
    title: "Not the token owner",
    detail: "This wallet does not own the referenced position.",
  },
  {
    selector: "ERC721InvalidApprover(address)",
    title: "Invalid approver",
    detail: "The approval sender is not the token owner.",
  },
  {
    selector: "ERC721InvalidOperator(address)",
    title: "Invalid operator",
    detail: "The operator is not approved for this token.",
  },
];

const LEGACY_ERRORS: readonly ErrorSpec[] = [
  {
    selector: "InsufficientLotAmount()",
    title: "Not enough in this lot",
    detail: "The withdrawal exceeds the amount staked in this lot.",
  },
  {
    selector: "InvalidLotId()",
    title: "Lot does not exist",
    detail: "There is no lot with that id.",
  },
  {
    selector: "InsufficientReceiptBalance()",
    title: "Not enough receipt balance",
    detail: "This wallet holds less stETH receipt than requested.",
  },
  {
    selector: "ZeroAmount()",
    title: "Amount must be greater than zero",
    detail: "Enter a positive amount.",
  },
  {
    selector: "TransferFailed()",
    title: "Transfer failed",
    detail: "The contract could not deliver funds.",
  },
  {
    selector: "TokensNotSet()",
    title: "Token contracts not configured",
    detail: "The legacy vault has not been linked to its token contracts.",
  },
  {
    selector: "TokensAlreadySet()",
    title: "Token contracts already configured",
    detail: "The legacy token contracts can only be set once.",
  },
  {
    selector: "InvalidTokenContract(address)",
    title: "Invalid token contract",
    detail: "The referenced token contract is rejected by the legacy vault.",
    humanize: (a) => `Token: ${truncateAddr(a.token ?? a[0])}`,
  },
  {
    selector: "TokenVaultMismatch(address,address)",
    title: "Token bound to another vault",
    detail: "The token contract reports a different vault.",
  },
  {
    selector: "AmountExceedsLotLimit(uint256)",
    title: "Amount exceeds the lot limit",
    detail: "Deposit amounts are capped by the legacy contract's storage layout.",
  },
  {
    selector: "TimestampExceedsLotLimit(uint256)",
    title: "Timestamp exceeds the lot limit",
    detail: "Chain time is outside the legacy contract's supported range.",
  },
];

function matchSpec(errorish: { name?: string; details?: string; shortMessage?: string; message?: string }, specs: readonly ErrorSpec[]): ParsedError | null {
  const haystack = `${errorish.name ?? ""} ${errorish.details ?? ""} ${errorish.shortMessage ?? ""} ${errorish.message ?? ""}`;

  // 1. Look for a named custom-error selector anywhere in the text.
  for (const spec of specs) {
    const bare = spec.selector.replace(/\(.*\)/, "");
    if (haystack.includes(bare)) {
      return { title: spec.title, detail: spec.detail };
    }
  }
  // 2. Fall back to the raw revert payload the wallet surfaced.
  const raw = errorish.details ?? errorish.shortMessage ?? errorish.message ?? null;
  if (raw !== null && raw.length > 0) {
    return { title: "Transaction reverted", detail: raw };
  }
  return null;
}

/**
 * Maps a thrown error to {title, detail} for the given system's vocabulary.
 * Unknown errors keep the raw revert data string; returns null only when the
 * input carries no text at all.
 */
export function parseContractError(errorish: unknown, system: "conviction" | "legacy"): ParsedError | null {
  const e = (errorish ?? {}) as { name?: string; details?: string; shortMessage?: string; message?: string };
  return matchSpec(e, system === "conviction" ? CONVICTION_ERRORS : LEGACY_ERRORS);
}

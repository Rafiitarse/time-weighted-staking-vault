# StakingVault Subgraph

A [The Graph](https://thegraph.com/) subgraph that indexes the **StakingVault** smart contract — an ETH staking vault that tracks per-user deposit lots, age-based reward withdrawals, and protocol-wide staking statistics.

> Built with `specVersion: 1.3.0`, AssemblyScript mapping (`apiVersion: 0.0.9`), indexed on the **Sepolia** testnet.

---

## Table of Contents

- [Overview](#overview)
- [Contract Reference](#contract-reference)
- [Architecture](#architecture)
- [Data Model (Schema)](#data-model-schema)
- [Event Handlers](#event-handlers)
- [Entity ID Conventions](#entity-id-conventions)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Build & Deployment](#build--deployment)
- [Example Queries](#example-queries)
- [Known Limitations & Edge Cases](#known-limitations--edge-cases)
- [Development Notes](#development-notes)
- [License](#license)

---

## Overview

`StakingVault` is a smart contract that allows users to deposit ETH into individually tracked **deposit lots**. Each lot accrues rewards based on its age, and can be partially or fully withdrawn via `withdrawFromLot()`. This subgraph indexes all on-chain activity emitted by the contract and exposes a GraphQL API that surfaces:

- Per-user staking totals and history
- Individual deposit lots and their lifecycle (`ACTIVE` → `CLOSED`)
- A full audit trail of withdrawals, including rewards earned
- Protocol-wide aggregate statistics (total staked, total rewards distributed, total lots created)
- The configured receipt and reward token addresses

---

## Contract Reference

| Property         | Value                                          |
|-------------------|------------------------------------------------|
| Contract name     | `StakingVault`                                  |
| Network            | Sepolia                                        |
| Address            | `0x4EbF2EE5753F729F1D8C166BA36783eD35ab48Bf`    |
| Start block        | `11674936`                                      |

### Key Functions

| Function | Mutability | Description |
|---|---|---|
| `deposit()` | `payable` | Opens a new deposit lot with the sent ETH amount. |
| `withdrawFromLot(lotId, amount)` | `nonpayable` | Withdraws `amount` from lot `lotId`, paying out an age-based reward. |
| `setTokens(receiptToken, rewardToken)` | `nonpayable` | Owner-only. Configures the receipt and reward token addresses (one-time). |
| `pause()` / `unpause()` | `nonpayable` | Owner-only. Pauses/unpauses deposits and withdrawals. |
| `getUserLots(user)` | `view` | Returns all deposit lots for a given user. |
| `userLots(address, uint256)` | `view` | Returns a single lot (`amount`, `timestamp`) by index. |
| `receiptToken()` / `rewardToken()` | `view` | Returns the configured token addresses. |
| `owner()` / `paused()` | `view` | Returns contract admin state. |

### Events Indexed by This Subgraph

| Event | Signature | Emitted When |
|---|---|---|
| `Deposited` | `Deposited(indexed address user, uint256 lotId, uint256 amount, uint256 timestamp)` | A user calls `deposit()`, opening a new lot. |
| `Withdrawn` | `Withdrawn(indexed address user, uint256 lotId, uint256 amount, uint256 rewardAmount)` | A user calls `withdrawFromLot()`, partially or fully closing a lot. |
| `TokensSet` | `TokensSet(indexed address receiptToken, indexed address rewardToken)` | The owner calls `setTokens()` (expected to fire once). |

### Custom Errors

The contract reverts with the following custom errors, which are not indexed by the subgraph but are useful context for integrators:

`ZeroAmount`, `InsufficientReceiptBalance`, `TransferFailed`, `InvalidLotId`, `InsufficientLotAmount`, `TokensNotSet`, `TokensAlreadySet`.

---

## Architecture

```
┌─────────────────────┐      emits      ┌──────────────────────┐
│   StakingVault.sol   │ ───────────────▶│   graph-node indexer  │
│  (Sepolia contract)  │   Deposited      │  (AssemblyScript      │
│                      │   Withdrawn      │   mapping handlers)   │
│                      │   TokensSet      │                       │
└─────────────────────┘                  └──────────┬────────────┘
                                                       │ writes
                                                       ▼
                                          ┌──────────────────────┐
                                          │   Subgraph Entities    │
                                          │  User · DepositLot ·   │
                                          │  LotWithdrawal ·       │
                                          │  ProtocolStat          │
                                          └──────────┬────────────┘
                                                       │ served via
                                                       ▼
                                          ┌──────────────────────┐
                                          │     GraphQL API        │
                                          └──────────────────────┘
```

Each of the three on-chain events maps to a single handler function in [`src/staking-vault.ts`](./src/staking-vault.ts):

| Event | Handler |
|---|---|
| `Deposited` | `handleDeposited` |
| `Withdrawn` | `handleWithdrawn` |
| `TokensSet` | `handleTokensSet` |

---

## Data Model (Schema)

The schema defines four entities. Full definitions live in [`schema.graphql`](./schema.graphql).

### `User`

Represents a unique depositor. One entity per wallet address; created lazily on first interaction.

| Field | Type | Description |
|---|---|---|
| `id` | `Bytes!` | The user's wallet address. |
| `totalEthStaked` | `BigInt!` | Cumulative ETH ever deposited (wei). Does **not** decrease on withdrawal. |
| `totalRewardEarned` | `BigInt!` | Cumulative reward tokens earned across all withdrawals (wei). |
| `lots` | `[DepositLot!]!` | Derived — all lots opened by this user. |
| `withdrawals` | `[LotWithdrawal!]!` | Derived — all withdrawals made by this user. |

### `DepositLot`

Represents a single deposit created by one call to `deposit()`. A user may own many lots.

| Field | Type | Description |
|---|---|---|
| `id` | `ID!` | `{userAddress}-{lotId}`, e.g. `0xabc123...-0`. |
| `user` | `User!` | Owner of the lot. |
| `lotId` | `BigInt!` | On-chain lot index — matches `userLots[user][lotId]` and the `lotId` parameter of `withdrawFromLot`. |
| `originalAmount` | `BigInt!` | ETH originally deposited into this lot (wei). |
| `remainingAmount` | `BigInt!` | ETH still remaining after partial withdrawals (wei). |
| `depositTimestamp` | `BigInt!` | Block timestamp at creation — used for the contract's age-based reward multiplier. |
| `status` | `LotStatus!` | `ACTIVE` while `remainingAmount > 0`, otherwise `CLOSED`. |
| `withdrawals` | `[LotWithdrawal!]!` | Derived — all withdrawals made against this lot. |

**`LotStatus` enum:** `ACTIVE` | `CLOSED`

### `LotWithdrawal`

An immutable record of a single `withdrawFromLot()` call.

| Field | Type | Description |
|---|---|---|
| `id` | `ID!` | `{transactionHash}-{logIndex}`. |
| `lot` | `DepositLot!` | The lot withdrawn from. |
| `user` | `User!` | The user who performed the withdrawal. |
| `amountWithdrawn` | `BigInt!` | ETH withdrawn from the lot (wei). |
| `rewardAmount` | `BigInt!` | Reward tokens minted for this withdrawal (wei). |
| `timestamp` | `BigInt!` | Block timestamp of the withdrawal. |

### `ProtocolStat`

A singleton entity (`id` is always `"global"`) aggregating protocol-wide statistics.

| Field | Type | Description |
|---|---|---|
| `id` | `ID!` | Always `"global"`. |
| `totalEthStakedAllUsers` | `BigInt!` | Cumulative ETH deposited by all users (wei). |
| `totalRewardsDistributed` | `BigInt!` | Cumulative rewards distributed to all users (wei). |
| `totalLotsCreated` | `BigInt!` | Total number of deposit lots ever created. |
| `receiptToken` | `Bytes` | Receipt token address, set via `setTokens()`. |
| `rewardToken` | `Bytes` | Reward token address, set via `setTokens()`. |

### Entity Relationship Diagram

```
User (1) ────────< (N) DepositLot (1) ────────< (N) LotWithdrawal
  │                                                    │
  └──────────────────< (N) ─────────────────────────────┘
                (derived: all withdrawals by user)

ProtocolStat (singleton, "global") — aggregates across all Users/Lots
```

---

## Event Handlers

Implementation lives in [`src/staking-vault.ts`](./src/staking-vault.ts).

### `handleDeposited`

Triggered on every `Deposited` event.

1. Loads or creates the `User` entity for the depositor and increments `totalEthStaked`.
2. Creates a brand-new `DepositLot` (lots are never reused on-chain — each `deposit()` call pushes a new array element) with status `ACTIVE`.
3. Increments the global `ProtocolStat` counters: `totalEthStakedAllUsers` and `totalLotsCreated`.

### `handleWithdrawn`

Triggered on every `Withdrawn` event.

1. Loads the `User` entity (created if somehow missing).
2. Loads the matching `DepositLot` via the deterministic `{user}-{lotId}` id.
   - If the lot cannot be found, a warning is logged (see [Known Limitations](#known-limitations--edge-cases)), but the withdrawal and stats are still recorded so no accounting is silently dropped.
   - Otherwise, `remainingAmount` is decremented by the withdrawn amount, and the lot's `status` flips to `CLOSED` once `remainingAmount` reaches zero.
3. Creates an immutable `LotWithdrawal` record keyed by `{transactionHash}-{logIndex}`.
4. Increments the user's `totalRewardEarned`.
5. Increments the global `ProtocolStat.totalRewardsDistributed`.

### `handleTokensSet`

Triggered on the (expected one-time) `TokensSet` event.

1. Loads the global `ProtocolStat` singleton.
2. Records `receiptToken` and `rewardToken` addresses.

---

## Entity ID Conventions

| Entity | ID Format | Example |
|---|---|---|
| `User` | Wallet address (`Bytes`) | `0xabc123...` |
| `DepositLot` | `{userAddress}-{lotId}` | `0xabc123...-0` |
| `LotWithdrawal` | `{transactionHash}-{logIndex}` | `0xdeadbeef...-2` |
| `ProtocolStat` | Fixed literal | `global` |

The `DepositLot` id is intentionally deterministic: it mirrors the on-chain `userLots[user][lotId]` mapping, so `handleWithdrawn` can recompute the exact same id from the `(user, lotId)` pair emitted in the `Withdrawn` event — no need to store or look up a foreign key separately.

---

## Project Structure

```
.
├── schema.graphql          # GraphQL entity definitions
├── subgraph.yaml            # Subgraph manifest (data sources, event handlers)
├── abis/
│   └── StakingVault.json    # Contract ABI
└── src/
    └── staking-vault.ts     # AssemblyScript event mapping handlers
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Graph CLI](https://github.com/graphprotocol/graph-cli): `npm install -g @graphprotocol/graph-cli`
- A [Subgraph Studio](https://thegraph.com/studio/) account (for deployment) or a local [`graph-node`](https://github.com/graphprotocol/graph-node) instance

---

## Installation

```bash
# Install dependencies
npm install

# Generate AssemblyScript types from the schema and ABI
graph codegen

# Build the subgraph into deployable WASM/manifest artifacts
graph build
```

---

## Build & Deployment

### Deploy to Subgraph Studio

```bash
graph auth --studio <DEPLOY_KEY>
graph deploy --studio staking-vault-subgraph
```

### Deploy to a local graph-node

```bash
graph create --node http://localhost:8020/ staking-vault-subgraph
graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 staking-vault-subgraph
```

> **Note:** `indexerHints.prune: auto` is set in `subgraph.yaml`, allowing indexers to automatically prune historical block data they don't need to retain, which can improve indexing/query performance.

---

## Example Queries

### Get a user's total staked and reward history

```graphql
{
  user(id: "0xYOUR_ADDRESS") {
    totalEthStaked
    totalRewardEarned
    lots {
      id
      originalAmount
      remainingAmount
      status
      depositTimestamp
    }
    withdrawals {
      amountWithdrawn
      rewardAmount
      timestamp
    }
  }
}
```

### List all active deposit lots

```graphql
{
  depositLots(where: { status: ACTIVE }) {
    id
    user {
      id
    }
    remainingAmount
    depositTimestamp
  }
}
```

### Protocol-wide statistics

```graphql
{
  protocolStat(id: "global") {
    totalEthStakedAllUsers
    totalRewardsDistributed
    totalLotsCreated
    receiptToken
    rewardToken
  }
}
```

### Recent withdrawals across the protocol

```graphql
{
  lotWithdrawals(orderBy: timestamp, orderDirection: desc, first: 10) {
    id
    user {
      id
    }
    amountWithdrawn
    rewardAmount
    timestamp
  }
}
```

---

## Known Limitations & Edge Cases

- **`startBlock` sensitivity in `handleWithdrawn`:** If `subgraph.yaml`'s `startBlock` is set *after* a given lot's `Deposited` event was mined, `handleWithdrawn` will be unable to find the corresponding `DepositLot` entity. In that case the handler logs a warning but still records the `LotWithdrawal` and updates aggregate stats, so ETH/reward accounting is never silently dropped — however, the affected lot's `remainingAmount`/`status` will be inaccurate. Ensure `startBlock` is set at or before the contract's deployment/first `deposit()` block.
- **`TokensSet` is expected to fire once:** The mapping does not guard against multiple `TokensSet` emissions; if the owner were to call `setTokens()` more than once (which the contract's `TokensAlreadySet` error is designed to prevent), the `ProtocolStat` entity would simply be overwritten with the latest values.
- **`totalEthStaked` is cumulative, not a live balance:** `User.totalEthStaked` never decreases on withdrawal — for a user's *current* staked balance, sum the `remainingAmount` of their `ACTIVE` lots instead.

---

## Development Notes

- **Schema/mapping consistency:** Any change to `schema.graphql` requires re-running `graph codegen` before rebuilding, as the generated entity classes in `generated/schema` will otherwise be out of sync with `src/staking-vault.ts`.
- **ABI/manifest consistency:** The event signatures declared in `subgraph.yaml` (`eventHandlers`) must exactly match the ABI in `abis/StakingVault.json`, including argument order and indexing (`indexed` flags).
- **Address-as-Bytes:** `Address` extends `Bytes` in `graph-ts`, so no explicit conversion is needed when assigning `event.params.receiptToken` / `event.params.rewardToken` directly to `ProtocolStat.receiptToken` / `rewardToken`.

---

## License
<img src="https://img.shields.io/badge/MIT-green?style=for-the-badge"/>
# StakingVault — DApp Frontend

A Next.js (App Router) frontend for **StakingVault**, a time-locked ETH staking protocol deployed on the Sepolia testnet. Users deposit ETH into individual **Lots**, each of which accrues an escalating reward multiplier the longer it remains staked, and can withdraw from any Lot independently at any time.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Setup & Installation](#setup--installation)
7. [Environment Variables](#environment-variables)
8. [Smart Contract Reference](#smart-contract-reference)
9. [Reward Multiplier Schedule](#reward-multiplier-schedule)
10. [Component Reference](#component-reference)
11. [Design System](#design-system)
12. [Error Handling Reference](#error-handling-reference)
13. [Known Assumptions & Limitations](#known-assumptions--limitations)

---

## Overview

StakingVault allows a user to deposit ETH at any time, with each deposit recorded on-chain as a discrete **Lot** (amount + timestamp). Reward eligibility is calculated per Lot based on its individual age, which means a user can hold multiple Lots at different maturity stages simultaneously and withdraw from each independently.

This repository contains the client-side application layer: wallet connectivity, transaction lifecycle management, real-time Lot tracking, and protocol-wide analytics sourced from a dedicated subgraph.

## Features

### Wallet Connectivity
- Wallet connection and session management via **ConnectKit**, themed to match the application's dark glass UI (custom CSS variable overrides, no default widget styling).
- Automatic wrong-network detection with a one-click **"Switch to Sepolia Testnet"** action, surfaced independently in both the deposit flow and each Lot's withdrawal form.

### Deposit Flow
- ETH amount input with inline validation (rejects zero, negative, and non-numeric values).
- Real-time 1:1 receipt token (svETH) issuance preview.
- Visual **reward tier ladder** showing all six multiplier stages and their approximate time-to-unlock, so users understand the trade-off before committing funds.
- Full transaction lifecycle handling: idle → awaiting signature → confirming → success/error, each with distinct UI states.

### Lot Management
- Live, self-updating list of a connected user's active Lots, pulled directly from `getUserLots(address)`.
- Real-time age counter (days/hours) that ticks without requiring a page refresh.
- Color-graded multiplier badges — badge intensity increases visually from tier to tier, reinforcing the "the longer you hold, the more it's worth" mechanic.
- A "days remaining to next tier" indicator for Lots that haven't yet reached the maximum multiplier.
- Inline, per-Lot withdrawal form with a **MAX** shortcut, live reward estimate, and independent transaction state — multiple Lots can be interacted with without state collisions.
- Automatic list refresh on-chain, via event subscriptions (`Deposited`, `Withdrawn`) — no manual polling or cross-component wiring required.

### Protocol Analytics
- Global protocol statistics (**Total ETH Staked**, **Total Reward Distributed**) fetched from a GraphQL subgraph.
- Automatic background refresh every 30 seconds.
- Skeleton loading states and a dedicated error state with a manual retry action.

### Notifications & Error Handling
- Centralized, dependency-free toast/alert system (success, error, info variants) with auto-dismiss.
- Solidity custom errors reverted by the contract (e.g. `InsufficientLotAmount`, `EnforcedPause`) are decoded from the revert data and surfaced as clear, human-readable messages rather than raw RPC errors.
- Explicit handling for user-rejected transactions (e.g. cancelling a MetaMask signature request).

## Tech Stack

| Layer | Library | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | Application shell and routing |
| Language | TypeScript | Static typing across all modules |
| Styling | Tailwind CSS | Utility-first styling, dark-mode glassmorphism UI |
| Wallet / Chain | Wagmi v2 + Viem | Wallet connection, contract reads/writes, event watching |
| Wallet UI | ConnectKit | Wallet selection and connection modal |
| Data Fetching | @tanstack/react-query | Caching, polling, and query state for both on-chain reads and subgraph queries |
| Indexing | graphql-request + graphql | Lightweight GraphQL client for subgraph queries |

## Project Structure

```
src/
├── app/
│   └── providers.tsx        # Wagmi, ConnectKit, React Query, and Toast providers
├── components/
│   ├── Navbar.tsx            # App header, logo mark, wallet connect button
│   ├── DepositCard.tsx       # Deposit form + reward tier ladder
│   ├── UserLotsList.tsx      # Live Lot list + per-Lot withdrawal
│   └── Analytics.tsx         # Subgraph-driven protocol statistics
└── lib/
    ├── contract.ts           # ABI, address, reward tier logic, error parsing
    ├── toast.tsx             # Toast/alert provider and hook
    └── utils.ts               # Formatting helpers (address, ETH, duration, classnames)
```

## Prerequisites

- A WalletConnect Cloud project ID ([cloud.walletconnect.com](https://cloud.walletconnect.com)).
- Sepolia testnet ETH in the connecting wallet (available from any public Sepolia faucet).
- A deployed and synced subgraph exposing the fields described in [Smart Contract Reference](#smart-contract-reference).

## Setup & Installation

The required packages (`wagmi`, `viem`, `connectkit`, `@tanstack/react-query`, `graphql-request`, `graphql`) are assumed to already be installed in the host project.

1. **Wrap the application** with the `Providers` component in the root layout:

   ```tsx
   // src/app/layout.tsx
   import { Providers } from "./providers";

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en">
         <body>
           <Providers>{children}</Providers>
         </body>
       </html>
     );
   }
   ```

2. **Configure environment variables** (see below).
3. **Compose the page** using the exported components, e.g.:

   ```tsx
   import { Navbar } from "@/components/Navbar";
   import { DepositCard } from "@/components/DepositCard";
   import { UserLotsList } from "@/components/UserLotsList";
   import { Analytics } from "@/components/Analytics";

   export default function Page() {
     return (
       <>
         <Navbar />
         <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
           <Analytics />
           <div className="grid gap-6 lg:grid-cols-2">
             <DepositCard />
             <UserLotsList />
           </div>
         </main>
       </>
     );
   }
   ```

4. Run the development server as usual (`npm run dev`).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID, used by ConnectKit to enable WalletConnect-based wallets. |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | No | Custom Sepolia RPC endpoint. Falls back to a public RPC (`https://rpc.sepolia.org`) if unset — a dedicated provider (Alchemy, Infura, etc.) is recommended for production use. |

## Smart Contract Reference

| Property | Value |
|---|---|
| Network | Sepolia Testnet |
| Contract Address | `0x4EbF2EE5753F729F1D8C166BA36783eD35ab48Bf` |

**Core functions used by this frontend:**

| Function | Type | Description |
|---|---|---|
| `deposit()` | `payable`, write | Deposits ETH and creates a new Lot at the current block timestamp. |
| `getUserLots(address)` | view | Returns all Lots (`{ amount, timestamp }`) belonging to a user. |
| `withdrawFromLot(lotId, amount)` | write | Withdraws a specified amount from a specific Lot, identified by its index in the `getUserLots` array. |
| `userLots(address, uint256)` | view | Direct mapping accessor for a single Lot by index. |

**Events consumed for reactive updates:**

| Event | Emitted On | Used For |
|---|---|---|
| `Deposited(user, lotId, amount, timestamp)` | Successful deposit | Triggers an automatic refetch of the user's Lot list. |
| `Withdrawn(user, lotId, amount, rewardAmount)` | Successful withdrawal | Triggers an automatic refetch of the user's Lot list. |

## Reward Multiplier Schedule

Multiplier is determined by the age of an individual Lot at the time of withdrawal. This schedule is mirrored client-side (`lib/contract.ts`) for instant previews, while the authoritative value is always calculated on-chain during `withdrawFromLot`.

| Lot Age | Multiplier | Basis Points |
|---|---|---|
| < 183 days | 0% | 0 / 1000 |
| ≥ 183 days | 15% | 150 / 1000 |
| ≥ 366 days | 20% | 200 / 1000 |
| ≥ 549 days | 25% | 250 / 1000 |
| ≥ 732 days | 30% | 300 / 1000 |
| ≥ 915 days | 35% | 350 / 1000 |
| ≥ 1098 days | 40% | 400 / 1000 |

## Component Reference

### `app/providers.tsx`
Composes `WagmiProvider`, `QueryClientProvider`, `ConnectKitProvider`, and `ToastProvider` into a single client boundary. Configures Wagmi for Sepolia only and applies a custom ConnectKit theme matching the app's palette.

### `components/Navbar.tsx`
Sticky, translucent header containing the application mark and a fully custom-rendered `ConnectKitButton.Custom`, showing connection status, truncated address, or ENS name.

### `components/DepositCard.tsx`
Handles the full deposit flow: amount input, 1:1 receipt token preview, reward tier ladder, network validation, and transaction lifecycle via `useWriteContract` / `useWaitForTransactionReceipt`. Reports outcomes through `useToast`.

### `components/UserLotsList.tsx`
Reads `getUserLots` via `useReadContract`, subscribes to `Deposited`/`Withdrawn` via `useWatchContractEvent` for automatic refresh, and renders one `LotRow` per active Lot. Each `LotRow` manages its own live age calculation, multiplier badge, and withdrawal sub-form independently.

### `components/Analytics.tsx`
Queries the subgraph endpoint via `graphql-request`, wrapped in a `useQuery` hook with a 30-second polling interval. Renders two `StatPanel` cards with loading, success, and error/retry states.

### `lib/contract.ts`
Single source of truth for the contract ABI, address, chain, the reward tier table (`REWARD_TIERS`), tier lookup helpers (`getMultiplierForAge`, `getNextTier`), and `parseContractError`, which decodes custom Solidity revert errors into user-facing messages.

### `lib/toast.tsx`
Self-contained toast/alert system (`ToastProvider`, `useToast`) with success, error, and info variants — no external notification library required.

### `lib/utils.ts`
Formatting utilities: `formatAddress` (truncated address), `formatEth` (wei → locale-formatted ETH string), `formatDurationShort` (live age display), and `cn` (conditional classnames).

## Design System

The interface follows a dark, glassmorphic "vault" aesthetic rather than the more common neon-on-black crypto dashboard look:

| Token | Value | Usage |
|---|---|---|
| Background | `#0E1116` | Base app background |
| Surface | `rgba(255,255,255,0.03–0.06)` + `backdrop-blur` | Glass panels and cards |
| Primary Accent | `#D4A857` (brass/gold) | Primary actions, active states |
| Success | `#6FA287` | Success toasts, connected indicator |
| Error / Warning | `#E2725B` | Error toasts, wrong-network prompts |
| Info | `#4FA8D6` | Informational toasts, analytics accents |
| Text Primary | `#E8E6E1` | Headings and primary content |
| Text Muted | `#8B93A1` | Secondary labels and helper text |

Reward tier badges use a dedicated seven-step color ramp (from muted slate at 0% to bright gold at 40%) so multiplier progress is legible at a glance without relying on text alone.

## Error Handling Reference

Custom contract errors are mapped to user-facing messages in `lib/contract.ts`:

| Contract Error | Surfaced Message Context |
|---|---|
| `EnforcedPause` | Vault is currently paused by the admin. |
| `ExpectedPause` | Action is only available while the vault is paused. |
| `InsufficientLotAmount` | Withdrawal amount exceeds the Lot's remaining balance. |
| `InsufficientReceiptBalance` | Receipt token balance is insufficient for this transaction. |
| `InvalidLotId` | The referenced Lot does not exist or is no longer valid. |
| `TransferFailed` | The underlying ETH transfer failed. |
| `ZeroAmount` | Transaction amount cannot be zero. |
| `ReentrancyGuardReentrantCall` | Transaction blocked due to a reentrancy guard trigger. |
| *User-rejected signature* | Transaction was cancelled from the wallet (e.g. MetaMask). |

## Known Assumptions & Limitations

- **Subgraph schema:** `Analytics.tsx` queries a singleton `protocol(id: "1")` entity with `totalStaked` and `totalRewardsDistributed` fields. Adjust the query in `lib/contract.ts`-adjacent code to match your actual `schema.graphql` if entity or field names differ.
- **Lot identification:** `withdrawFromLot(lotId, amount)` is called using the Lot's index within the `getUserLots()` array, consistent with the `userLots(address, uint256)` mapping accessor in the ABI.
- **UI copy language:** User-facing text is currently written in Bahasa Indonesia with standard English DeFi terminology retained (e.g. "Deposit", "Withdraw", "Connect Wallet"). Copy can be localized or translated independently of the underlying logic.
- **Notification persistence:** Toasts are held in in-memory React state and are cleared on page reload; they are not persisted or queued across sessions.
- **List scalability:** `UserLotsList` renders all active Lots without pagination or virtualization, which is suitable for typical usage but may need revisiting for accounts with a very large number of Lots.

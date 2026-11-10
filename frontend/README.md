# Legacy StakingVault Frontend

This Next.js app is the existing frontend for the legacy Sepolia `StakingVault`. It is not integrated with the newer Conviction Vault contracts: it uses the legacy contract ABI/address, legacy lot IDs, and legacy reward tiers. It does not read CVP NFTs or issue/claim CVR.

The frontend's configured vault address is `0x4EbF2EE5753F729F1D8C166BA36783eD35ab48Bf` on Sepolia. This is a source-code configuration value, not a guarantee that the endpoint or deployment is currently available.

## What the app currently does

- Connects wallets with ConnectKit and Wagmi; prompts connected wallets to switch to Sepolia when needed.
- Sends ETH deposits to the legacy vault and reads the connected user's legacy lots from `getUserLots(address)`.
- Calculates client-side previews using the legacy reward schedule, then sends withdrawals through `withdrawFromLot(lotId, amount)`.
- Refreshes the lot list when it observes the legacy `Deposited` and `Withdrawn` events.
- Displays aggregate legacy metrics from the configured GraphQL endpoint in `components/Analytics.tsx`.

The UI currently labels the receipt preview `svETH` and reward preview `svRWD`. These are display strings in the frontend; the legacy token contracts declare their symbols as `stETH` and `RWD`. The app has not been updated to the CVP/CVR names.

## Tech stack

Versions below are taken from `package.json`:

| Package | Version |
|---|---|
| Next.js | `16.3.4` |
| React / React DOM | `19.2.8` |
| TypeScript | `^5` |
| Wagmi | `^3.7.7` |
| Viem | `^2.56.3` |
| ConnectKit | `^1.9.2` |
| TanStack Query | `^5.102.8` |
| Tailwind CSS | `^4` |
| GraphQL / graphql-request | `^17.0.2` / `^7.4.0` |

## Run locally

Use Node.js and npm. The repository's `.npmrc` enables `legacy-peer-deps`.

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Next.js. To run the available checks:

```bash
npm run lint
npm run build
```

The root GitLab CI currently runs `npm run build`; it does not run the frontend lint script.

## Environment and endpoints

| Variable / setting | Current behavior |
|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Passed to ConnectKit; defaults to an empty string when unset. Set a WalletConnect Cloud project ID to enable WalletConnect-based connections. |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Optional Sepolia RPC URL; the app falls back to `https://rpc.sepolia.org`. |
| Vault address and chain | Hard-coded in `lib/contract.ts`; Sepolia and `0x4EbF2EE5753F729F1D8C166BA36783eD35ab48Bf`. |
| Analytics GraphQL endpoint | Hard-coded in `components/Analytics.tsx` as `https://api.studio.thegraph.com/query/1760076/staking-vault/version/latest`. It indexes the legacy subgraph, not Conviction contracts. |

The GraphQL endpoint is not configurable through an environment variable in the current frontend.

## Legacy contract integration

The frontend ABI in `lib/contract.ts` targets the legacy `StakingVault` interface:

| Function / event | Use |
|---|---|
| `deposit()` | Payable legacy ETH deposit; creates a lot for the caller. |
| `getUserLots(address)` | Reads that wallet's lot array (`amount`, `timestamp`). |
| `withdrawFromLot(lotId, amount)` | Withdraws from a lot selected by its index in the caller's lot array. |
| `Deposited`, `Withdrawn` | Trigger a lot-list refetch when observed for the connected wallet. |

Legacy reward multipliers are computed in `lib/contract.ts` for display and preview; the vault contract performs the authoritative calculation. The legacy schedule is 0/1000 before 183 days, then 150/1000, 200/1000, 250/1000, 300/1000, 350/1000, and 400/1000 at 183, 366, 549, 732, 915, and 1,098 days respectively.

## Project layout

```text
app/
  layout.tsx
  page.tsx
  globals.css
components/
  Analytics.tsx
  DepositCard.tsx
  Navbar.tsx
  UserLotsList.tsx
lib/
  contract.ts
  providers.tsx
  toast.tsx
  utils.ts
```

`app/page.tsx` composes the analytics, deposit, and user-lot components. `lib/providers.tsx` configures Wagmi/ConnectKit for Sepolia and wraps the app in React Query and toast providers.

## Current limitations

- This app remains coupled to the legacy StakingVault and its hard-coded address, ABI, token-display strings, and tier table.
- It does not support CVP ownership or transfers, CVR funding, RewardDistributor status, or the new Conviction vault.
- The legacy subgraph provides cumulative totals; its protocol-wide ETH total is cumulative deposits, not a live ETH balance. The displayed rewards metric is also read from that legacy indexer.
- The RPC fallback and GraphQL URL are public, hard-coded endpoints. Their availability is not guaranteed by this repository.

# Conviction Vault frontend

The Next.js app exposes three routes:

- `/` — Conviction dashboard with the bonus schedule, on-chain status, ETH deposit form, and CVP positions.
- `/legacy` — Sepolia manager for existing lot positions in the legacy `StakingVault` (`stETH` receipt and `RWD` reward). Legacy positions are not migrated.
- `/admin` — read-only operator/deployment information. The page does not create Safe proposals or send privileged transactions.

Conviction contracts are not deployed to a public network. The app defaults to local Anvil. Never treat the zero-address Sepolia example as a live deployment.

## Product behavior

Conviction's bonus is calculated once on the principal withdrawn. It is not APY, interest, or a guarantee of value. ETH principal remains withdrawable at any time; maturity changes reward eligibility only. If the reward pool cannot pay the complete CVR quote, the withdrawal can proceed with zero CVR and no unpaid reward debt. CVR has no redemption value, revenue share, or governance rights.

The legacy system is separate and follows its own contract behavior and 0–40% reward tiers. Conviction uses the approved 0–15% tiers.

## Run locally

Requires Node.js and npm. From this directory:

```sh
npm ci
npm run dev
```

For a fully configured on-chain demo, follow [DEMO.md](./DEMO.md). The demo uses local Anvil accounts and local chain state. `/legacy` always reads Sepolia using the canonical `deployments/legacy-sepolia.json` metadata and still needs a wallet with Sepolia access to transact.

## Configuration

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_DEPLOYMENT` | Conviction deployment name (`anvil` or `sepolia`); defaults to `anvil` |
| `NEXT_PUBLIC_ANVIL_RPC_URL` | Anvil RPC endpoint; defaults to `http://127.0.0.1:8545` |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Sepolia RPC endpoint; defaults to `https://rpc.sepolia.org` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Enables Reown WalletConnect; absent means injected wallet only |
| `NEXT_PUBLIC_APP_URL` | App URL passed to wallet connection metadata |
| `NEXT_PUBLIC_SITE_URL` | Optional public site URL used for Next.js metadata URLs |

Conviction addresses and start block come from `deployments/<network>.json`. Legacy vault address, chain, start block, and Graph endpoint come from `deployments/legacy-sepolia.json`. The legacy subgraph check and Conviction manifest renderer use those sources; generated Conviction manifest/ABI/build files remain local build output.

## Checks

```sh
npm run lint
npm test
npm run build
```

Vitest covers metadata validation, bonus tiers, error mapping, transaction receipts, and CVP log-based position discovery. The GitLab pipeline runs these frontend checks, the Foundry build/tests/coverage job, and the legacy plus Conviction subgraph generation/build/test jobs. Manual deployment jobs currently deploy only the legacy system; see the root `.gitlab-ci.yml`.

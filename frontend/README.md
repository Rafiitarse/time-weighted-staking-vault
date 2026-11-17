# Conviction Vault frontend

This Next.js app provides two deliberately separate surfaces:

- `/` — the Conviction Vault dashboard, showing the approved one-time CVR bonus tiers, live contract status, ETH deposits, and CVP positions.
- `/legacy` — reads and manages existing deposit lots on the legacy Sepolia `StakingVault` using its `stETH` receipt and `RWD` reward tokens. Legacy positions are not migrated.
- `/admin` — operator information; it does not submit privileged transactions.

Conviction contracts are not deployed to a public network in this checkout. Their addresses must come from deployment metadata. Do not treat the included Anvil example as a public deployment.

## Product behavior

The Conviction bonus is calculated once on the principal amount withdrawn. It is not APY, interest, or a guarantee of value. ETH principal can be withdrawn at any time; maturity affects reward eligibility only. If the distributor cannot cover a full reward, CVR may be skipped while principal withdrawal proceeds. CVR has no redemption value, revenue share, or governance rights.

The legacy system follows its own contract and reward rules. Its 0–40% legacy reward schedule is not the Conviction 0–15% schedule.

## Run locally

Requires Node.js and npm. The repository `.npmrc` enables legacy peer dependency resolution.

```bash
cd frontend
npm ci
npm run dev
```

The default deployment is Anvil. Start the local node and deploy/configure the demo contracts with the scripts documented in [DEMO.md](./DEMO.md). Set `NEXT_PUBLIC_DEPLOYMENT=sepolia` only when the matching Conviction deployment metadata contains real addresses. `/legacy` always uses `deployments/legacy-sepolia.json` and Sepolia.

## Configuration

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_DEPLOYMENT` | Conviction metadata filename/network (`anvil` or `sepolia`), default `anvil` |
| `NEXT_PUBLIC_ANVIL_RPC_URL` | Anvil RPC, default `http://127.0.0.1:8545` |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Sepolia RPC, default `https://rpc.sepolia.org` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Enables WalletConnect through Reown; absent means injected wallet only |
| `NEXT_PUBLIC_APP_URL` | Public app URL used in wallet connection metadata |

`deployments/<network>.json` is the canonical Conviction address and start-block input. `deployments/legacy-sepolia.json` is the canonical legacy vault address, start block, and Graph endpoint. The subgraph metadata checker compares the legacy manifest to that file; the Conviction manifest renderer reads the Conviction deployment file and the frontend ABI artifacts.

## Checks

```bash
npm run lint
npm test
npm run build
```

The available unit suite covers metadata validation, reward tiers, error mapping, receipt parsing, and CVP event-based position discovery.

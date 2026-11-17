# Time-Weighted ETH Vault

This repository contains two separate staking systems:

- **Legacy StakingVault**: the existing Sepolia deployment, frontend route at `/legacy`, and lot-based subgraph. It uses the legacy `stETH` receipt and `RWD` reward tokens.
- **Conviction Vault**: the newer CVP position NFT, fixed-supply CVR reward token, reward distributor, dashboard, and subgraph template. Contracts and subgraph are implemented and locally tested, but Conviction has **not** been deployed to a public network.

Deposits in the Conviction Vault remain disabled until the Safe admin links the RewardDistributor. There are no public Conviction contract addresses in this repository. The included zero-address Sepolia example is for build validation only. See [the current state and verification report](./docs/REPO-CURRENT-STATE.md) for the latest branch, UI gate, CI, and deployment evidence.

## Repository status

| Area | Current state |
|---|---|
| Contracts | Legacy `StakingVault` plus Conviction `ConvictionVault`, `ConvictionRewards`, and `RewardDistributor` |
| Frontend | Conviction dashboard at `/`, separate legacy Sepolia lot manager at `/legacy`, read-only operator information at `/admin` |
| Subgraphs | Legacy Sepolia indexer and separately built Conviction CVP/CVR mapping; neither config proves a live indexer endpoint |
| Conviction deployment | Deploy script and local Anvil demo exist; no public deployment is recorded |
| Upgrade roadmap | Stages 1–6 approved; Stage 7 not started |
| Frontend design gate | Local production-browser gate passed on 2026-11-17: 0 failures, 19 non-blocking warnings |

The legacy vault address is `0x4EbF2EE5753F729F1D8C166BA36783eD35ab48Bf` on Sepolia, with subgraph start block `11674936`. These are repository configuration values, not proof of current RPC, contract, or indexer availability.

## Conviction system

| Contract | Behavior |
|---|---|
| `contracts/src/ConvictionVault.sol` | Holds ETH and creates one transferable ERC-721 Conviction Position (`CVP`) per deposit. Only the current NFT owner may withdraw. Partial withdrawals preserve the position timestamp; full withdrawals burn the NFT. |
| `contracts/src/ConvictionRewards.sol` | Fixed 10,000,000 CVR supply, minted once to the treasury. No post-deployment mint authority. |
| `contracts/src/RewardDistributor.sol` | Permissionlessly funded CVR pool. Only the vault can request payout. Each reward is paid in full or skipped; there is no admin sweep. |

The bonus is a one-time amount on principal withdrawn, not annualized yield, interest, or a promise of token value. ETH principal can be withdrawn at any time; maturity affects reward eligibility only.

| Elapsed position age | Bonus on withdrawn principal |
|---|---:|
| Under 183 days | 0% |
| 183 days | 2.5% |
| 366 days | 5% |
| 549 days | 7.5% |
| 732 days | 10% |
| 915 days | 12.5% |
| 1,098 days or more | 15% |

Formula: `floor(withdrawn principal in wei × multiplier / 1000)`. If the distributor cannot cover the complete quote or its call fails, that withdrawal receives zero CVR and records no debt; principal withdrawal continues. CVR has no redemption value, revenue share, or governance rights.

## Development

### Contracts

Requires Foundry. From the repository root:

```sh
cd contracts
forge build
forge test
```

The current suite has 75 tests, including fuzz and stateful invariant coverage.

### Frontend

Requires Node.js and npm:

```sh
cd frontend
npm ci
npm run dev
```

The default Conviction network is local Anvil. Follow [frontend/DEMO.md](./frontend/DEMO.md) to deploy and configure the demo locally. See [frontend/README.md](./frontend/README.md) for routes, configuration, and checks.

### Subgraphs

The legacy package lives in `subgraph/staking-vault`; Conviction mapping and schema live in `subgraph/conviction-vault`. Build the legacy graph and validate shared metadata with:

```sh
cd subgraph/staking-vault
npm ci
npm run check:metadata
npm run codegen
npm run build
npm test
```

Build Conviction from the same directory using the zero-address example only for local code generation/build validation:

```sh
DEPLOYMENT_METADATA=../../deployments/sepolia.json.example ALLOW_UNCONFIGURED=1 NETWORK_NAME=sepolia npm run build:conviction
cd ../conviction-vault
npm ci
npm run codegen
npm test
```

See [subgraph/README.md](./subgraph/README.md) for metadata, test, and deployment details. A successful build does not mean a graph is deployed.

## Deployment metadata

- `deployments/legacy-sepolia.json` is the canonical address, chain, start block, and Graph endpoint for the legacy system.
- `deployments/<network>.json` is the canonical Conviction deployment input. The checked-in `sepolia.json.example` contains zero addresses and is not a deployment.
- Frontend metadata validation and the Conviction manifest renderer consume Conviction deployment data; the legacy metadata check guards the legacy manifest against its canonical file.

Deployment scripts do not prove a live deployment. The Conviction script deploys CVR, the vault, and the distributor; deposits require the Safe admin to configure the distributor after deployment. This repository does not publish new Conviction addresses.

## CI and security

`.gitlab-ci.yml` runs frontend lint/tests/build, Foundry build/tests, legacy and Conviction subgraph codegen/build/tests, and a legacy metadata check. The manual deployment jobs still target the legacy system. Coverage upload is optional and requires `CODECOV_TOKEN`.

The repository has not undergone a formal third-party security audit. Do not use the Conviction contracts with real funds based on local tests alone.

## License

MIT. See [LICENSE](./LICENSE).

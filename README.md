# Time-Weighted ETH Vault

This repository contains two distinct systems:

- The **legacy StakingVault application**: a Sepolia-configured Solidity vault, frontend, and subgraph using the legacy `stETH` receipt and `RWD` reward token.
- The **Conviction Vault contracts**: a newer CVP/CVR contract implementation in this checkout. It is not deployed or integrated with the frontend or subgraph, and its reward distributor has not been implemented.

The Conviction contracts are not ready for public deposits: `ConvictionVault` requires a one-time RewardDistributor configuration before deposits can be accepted. No new deployment addresses are published in this repository.

## Repository status

| Area | Current state |
|---|---|
| Contracts | Legacy `StakingVault` implementation and newer `ConvictionVault` / `ConvictionRewards` contracts with Foundry tests |
| Frontend | Sepolia-configured legacy app; calls the legacy `StakingVault` address |
| Subgraph | Legacy Sepolia `StakingVault` manifest and lot-oriented schema; does not index CVP NFTs |
| Reward distributor | Not implemented |
| Conviction deployment | Deployment script exists, but no deployment is recorded here |
| Upgrade progress | CVP/CVR contract implementation is awaiting user review; distributor and frontend/subgraph integration are not implemented |

Both legacy client configurations point at `0x4EbF2EE5753F729F1D8C166BA36783eD35ab48Bf` on Sepolia. The subgraph manifest specifies start block `11674936`. These are repository configuration values, not confirmation that the contracts or subgraph are currently available.

## Conviction contracts

| Contract | Implemented behavior |
|---|---|
| `contracts/src/ConvictionVault.sol` | Holds ETH and creates one transferable **Conviction Position (`CVP`)** ERC-721 per deposit. Each NFT tracks its own remaining principal and original timestamp. Only its current owner can withdraw; approved operators can transfer but cannot withdraw. |
| `contracts/src/ConvictionRewards.sol` | **Conviction Rewards (`CVR`)** ERC-20 with 10,000,000 tokens minted once to a nonzero treasury at deployment. It has no post-deployment mint function. |
| `contracts/script/DeployConvictionVault.s.sol` | Deploys CVR and the vault using `PRIVATE_KEY`, `TREASURY`, `SAFE_ADMIN`, and `GUARDIAN`. The script notes that deposits remain disabled until a distributor is configured. |

The vault's reward quote is informational only in this implementation. It does not pay CVR. The approved quote is a one-time bonus on the principal being withdrawn—not annualized yield:

| Elapsed lot age | Multiplier per 1,000 | Bonus |
|---|---:|---:|
| Under 183 days | 0 | 0% |
| 183 days | 25 | 2.5% |
| 366 days | 50 | 5% |
| 549 days | 75 | 7.5% |
| 732 days | 100 | 10% |
| 915 days | 125 | 12.5% |
| 1,098 days or more | 150 | 15% |

The quote formula is `floor(withdrawn principal in wei × multiplier / 1000)`. Stage 5 is planned to implement the funded distributor and reward payouts; those behaviors are not present yet.

## Legacy system

`contracts/src/StakingVault.sol`, `contracts/src/ReceiptToken.sol`, and `contracts/src/RewardToken.sol` remain the legacy implementation. It uses per-user deposit lots and the legacy `stETH` and `RWD` tokens. Its reward tiers range from 0% before 183 days to 40% from 1,098 days. The legacy frontend and subgraph still describe and use this system. Existing deployed token metadata cannot be renamed by changing source code.

## Development

### Contracts

Requires Foundry. From the repository root:

```bash
cd contracts
forge build
forge test
```

### Frontend

Requires Node.js and npm:

```bash
cd frontend
npm ci
npm run dev
```

See [frontend/README.md](./frontend/README.md) for the current legacy frontend configuration and limitations.

### Subgraph

Requires Node.js and npm:

```bash
cd subgraph/staking-vault
npm ci
npm run codegen
npm run build
```

See [subgraph/README.md](./subgraph/README.md) for the manifest, schema, query examples, and current test limitations.

## CI and deployment

The root `.gitlab-ci.yml` defines frontend build, contract build/test, coverage, and subgraph codegen/build jobs. Coverage upload is optional and requires `CODECOV_TOKEN`. Its manual deployment jobs target the legacy contracts and subgraph; there is no CVP/CVR deployment or frontend/subgraph integration job.

The legacy and Conviction deployment scripts are not evidence of a live deployment. The Conviction script only deploys CVR and the vault; it cannot enable deposits until a compatible RewardDistributor exists and is configured.

## Security

The repository has not undergone a formal third-party security audit. Do not treat the Conviction contracts as production-ready. Review and test the complete reward-distribution system before any deployment or use with real funds.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).

## Author

Lintar Ar' Rafii — [GitHub](https://github.com/Rafiitarse)

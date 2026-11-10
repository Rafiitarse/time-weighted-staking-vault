<div align="center">

# 🚀 Time-Weighted ETH Staking Vault

**A lot-based ETH vault built around transferable Conviction Positions and treasury-funded rewards.**

The repository currently contains the legacy staking application and a separately deployed Conviction Vault contract system under staged development. The new CVP/CVR contracts are not yet integrated with the frontend or subgraph; reward distribution is a later upgrade stage.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![Framework](https://img.shields.io/badge/Framework-Foundry-D64023?style=flat-square)](https://getfoundry.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![Coverage](https://codecov.io/gh/Rafiitarse/time-weighted-staking-vault/branch/main/graph/badge.svg)](https://codecov.io/gh/Rafiitarse/time-weighted-staking-vault)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Rafiitarse/time-weighted-staking-vault/ci-cd.yml?branch=main&style=flat-square&label=CI)](https://github.com/Rafiitarse/time-weighted-staking-vault/actions)

**Author:** [Lintar Ar' Rafii](https://github.com/Rafiitarse)

</div>

---

## 🧭 Quick Navigation

| Package | Description | Status |
|---|---|---|
| [`contracts/`](#-smart-contracts) | Core Solidity contracts, tests, and deployment scripts | 🟢 Active |
| [`subgraph/`](./subgraph/README.md) | The Graph indexer for on-chain events and analytics | 🟢 Active |
| [`frontend/`](./frontend/README.md) | Web3 dApp for depositing, tracking, and withdrawing | 🟢 Active |

---

## Table of Contents

- [Overview](#-overview)
- [Problems Solved](#-problems-solved)
- [Key Features](#-key-features)
- [Monorepo Architecture](#️-monorepo-architecture)
- [Smart Contracts](#-smart-contracts)
- [Reward Multiplier Tiers](#-reward-multiplier-tiers)
- [Getting Started](#️-getting-started)
- [Testing & Coverage](#-testing--coverage)
- [Deployment](#-deployment)
- [Security](#-security)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Author & Contact](#-author--contact)

---

## 📖 Overview

The approved Conviction Vault design keeps each deposit lot separate and represents it with a transferable **Conviction Position (`CVP`)** NFT. The position carries its remaining principal and original timestamp when transferred; only its current owner can withdraw principal.

The new **Conviction Rewards (`CVR`)** token has a fixed 10,000,000-token supply minted to the treasury at deployment. The Stage 4 vault currently provides informational reward quotes only: it does not issue CVR. Reward funding and payout integration are planned for Stage 5, so the new vault keeps deposits disabled until a compatible distributor is configured.

`StakingVault`, `ReceiptToken` (`stETH`), and `RewardToken` (`RWD`) remain in the repository as the legacy implementation. Their deployed metadata cannot be renamed, and the existing frontend and subgraph have not yet been migrated.

---

## 🎯 Legacy Design Context

The following describes the legacy implementation, not the new Conviction Vault contracts.

| # | Problem | Legacy solution |
|---|---|---|
| 1 | **Time dilution** — depositing additional funds resets or averages down the age of a user's original stake. | **Lot-based tracking.** Each deposit is isolated into its own `DepositLot`, so adding to a position never resets the maturity of earlier deposits. |
| 2 | **Secondary-market depegging** — liquid staking receipts get traded or dumped on DEXs, causing depegs and yield-farming exploits. | **Restricted transferability.** `stETH` minting/burning is locked to the vault contract; transfers are blocked, preserving a strict 1:1 backing with locked ETH. |
| 3 | **Mercenary capital** — flash loans or short-term stakes used to capture rewards without genuine commitment. | **Tiered maturity.** Rewards only begin accruing after a minimum 183-day holding period, aligning incentives with long-term supporters. |

---

## ✨ Legacy Features

- **Individual Deposit Lots** — each legacy lot packs `amount` (`uint128`) and `timestamp` (`uint64`) for gas-efficient storage.
- **Legacy Reward Tiers** — legacy `RWD` multipliers scale from **15%** at 6 months up to **40%** at 3+ years.
- **Soulbound Receipts (`stETH`)** — legacy non-transferable receipt tokens represent deposited ETH.
- **Partial Withdrawals** — withdraw a fraction of a lot without disturbing the maturity timestamp of the remaining balance.
- **Full On-Chain Indexing** — every deposit, withdrawal, and reward event is queryable via the companion [subgraph](./subgraph/README.md).
- **Security-Focused Design** — legacy contracts use OpenZeppelin security primitives.

---

## 🏗️ Monorepo Architecture

This project is organized as a monorepo, keeping the core smart contracts, off-chain indexing service, and frontend application in sync under a single source of truth.

```text
.
├── README.md
├── contracts
│   ├── broadcast
│   │   └── DeployStakingVault.s.sol
│   ├── foundry.lock
│   ├── foundry.toml
│   ├── lib
│   │   ├── forge-std              # git submodule
│   │   └── openzeppelin-contracts # git submodule
│   ├── remappings.txt
│   ├── script
│   │   ├── DeployConvictionVault.s.sol
│   │   └── DeployStakingVault.s.sol
│   ├── src
│   │   ├── ConvictionRewards.sol
│   │   ├── ConvictionVault.sol
│   │   ├── ReceiptToken.sol
│   │   ├── RewardToken.sol
│   │   └── StakingVault.sol
│   └── test
│       ├── ConvictionVaultTest.t.sol
│       └── VaultTest.t.sol
├── frontend
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── README.md
│   ├── app
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── Analytics.tsx
│   │   ├── DepositCard.tsx
│   │   ├── Navbar.tsx
│   │   └── UserLotsList.tsx
│   ├── eslint.config.mjs
│   ├── lib
│   │   ├── contract.ts
│   │   ├── providers.tsx
│   │   ├── toast.tsx
│   │   └── utils.ts
│   ├── next.config.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   └── tsconfig.json
└── subgraph
    ├── README.md
    └── staking-vault
        ├── abis
        ├── docker-compose.yml
        ├── networks.json
        ├── package-lock.json
        ├── package.json
        ├── schema.graphql
        ├── src
        ├── subgraph.yaml
        ├── tests
        └── tsconfig.json
```

**Data flow at a glance:**

```
User ──▶ StakingVault.sol ──emits events──▶ subgraph (The Graph) ──▶ GraphQL API ──▶ frontend
```

See the [subgraph README](./subgraph/README.md) for the full entity schema (`User`, `DepositLot`, `LotWithdrawal`, `ProtocolStat`) and example queries.

---

## 📜 Smart Contracts

| Contract | Role | Summary |
|---|---|---|
| **`ConvictionVault.sol`** | New vault, Stage 4 | Custodies ETH and issues one transferable CVP NFT per deposit lot. Only the current owner can withdraw; rewards are quoted but not paid yet. |
| **`ConvictionRewards.sol`** (`CVR`) | New reward token, Stage 4 | Fixed 10,000,000 CVR supply minted to the deployment treasury; no post-deployment mint authority. |
| **`RewardDistributor`** | Planned, Stage 5 | Treasury-funded, all-or-zero reward payout pool; not implemented yet. CVP vault deposits remain disabled until a distributor is configured. |
| **`StakingVault.sol`** | Legacy | Previous vault implementation; retained for historical deployments and the current legacy application. |
| **`ReceiptToken.sol`** (`stETH`) | Legacy position receipt | Non-transferable ERC-20 receipt for positions in the old system. Existing deployed metadata cannot be changed. |
| **`RewardToken.sol`** (`RWD`) | Legacy reward token | Token used by the old vault; not the reward token for new Conviction deployments. |

---

## 📊 Approved Conviction Reward Quote Tiers

The new vault quotes a one-time bonus on the principal amount being withdrawn, based on the exact age of that position. This is **not annual yield**, and Stage 4 does not issue the quoted CVR. Stage 5 will implement the funded distributor and payout behavior.

| Holding Period | Age (Days) | Multiplier (‰) | One-time bonus |
|---|---|---|---|
| Under 183 days | 0 – 182 | 0 | 0% |
| 183 days | 183 – 365 | 25 | 2.5% |
| 366 days | 366 – 548 | 50 | 5% |
| 549 days | 549 – 731 | 75 | 7.5% |
| 732 days | 732 – 914 | 100 | 10% |
| 915 days | 915 – 1,097 | 125 | 12.5% |
| 1,098+ days | 1,098+ | 150 | 15% |

**Formula:**

```
Quoted CVR = floor(Withdrawn Principal × Multiplier / 1000)
```

For the historical `RWD` tiers used by the legacy vault, see its source and legacy deployment documentation. Those older percentages do not describe the new CVR quote schedule.

---

## 🛠️ Getting Started

### Prerequisites

- [Foundry](https://getfoundry.sh/) (Forge, Cast, Anvil)
- [Git](https://git-scm.com/)
- Node.js ≥ 18 (required for the [`subgraph/`](./subgraph/README.md) and `frontend/` packages)

Install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Installation

```bash
# 1. Clone the repository
git clone --recurse-submodules https://github.com/Rafiitarse/time-weighted-staking-vault.git
cd time-weighted-staking-vault/contracts

# (If you already cloned without --recurse-submodules)
# git submodule update --init --recursive

# 2. Compile contracts
forge build
```

---

## 🧪 Testing & Coverage

```bash
# Run the full test suite
forge test

# Run with detailed call traces and gas reports
forge test -vvv --gas-report

# Generate a coverage report
forge coverage
```

Coverage results are automatically published to [Codecov](https://codecov.io/gh/Rafiitarse/time-weighted-staking-vault) on every push to `main`.

---

## 🚢 Deployment

### New Conviction contracts (Stage 4)

The new deployment script uses the agreed CVP/CVR identities. Provide `PRIVATE_KEY`, `TREASURY`, `SAFE_ADMIN`, and `GUARDIAN` in the environment, then run it from `contracts/`:

```bash
forge script script/DeployConvictionVault.s.sol:DeployConvictionVaultScript \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --broadcast \
  -vvvv
```

The script deploys CVR to the treasury and the CVP vault under Safe/guardian control. **Do not treat this as a ready-to-use deposit system:** no RewardDistributor exists until Stage 5, so deposits remain disabled. Stage 6 will integrate the new deployment with the frontend and subgraph. No deployment is authorized by this documentation.

### Legacy deployment

Deploy to a local Anvil instance or a live testnet using the Foundry deployment script.

1. Create a `.env` file inside `contracts/` with the following variables (this file is git-ignored — never commit it):

```bash
SEPOLIA_RPC_URL=
PRIVATE_KEY=
SAFE_ADMIN=
ETHERSCAN_API_KEY=
```

2. Run the deployment script from the `contracts/` directory. The script reads `PRIVATE_KEY` from the environment, so the key never has to appear on the command line or in your shell history:

```bash
cd contracts
source .env

forge script script/DeployStakingVault.s.sol:DeployVaultScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

Once deployed, update the contract `address` and `startBlock` in [`subgraph/staking-vault/subgraph.yaml`](./subgraph/staking-vault/subgraph.yaml) and redeploy the subgraph — see the [subgraph README](./subgraph/README.md#build--deployment) for details.

The deployer is not the vault admin. Set `SAFE_ADMIN` to the protocol Safe address; after deployment, have that Safe call `setTokens(receiptToken, rewardToken)` using the addresses printed by the script. Deposits remain unavailable until this one-time configuration succeeds.

### GitLab CI/CD

The [`.gitlab-ci.yml`](./.gitlab-ci.yml) pipeline runs the frontend, contract, subgraph, and coverage checks on merge requests targeting `main` or `master`, and on pushes to those branches. To deploy from GitLab, run a pipeline from the web UI on `main` or `master`, then start the relevant manual deploy job.

Add these as masked, protected CI/CD variables in GitLab:

- `SEPOLIA_RPC_URL`
- `PRIVATE_KEY`
- `SAFE_ADMIN`
- `ETHERSCAN_API_KEY`
- `GRAPH_DEPLOY_KEY`
- `SUBGRAPH_SLUG`
- `CODECOV_TOKEN` (optional; coverage upload is skipped if unset)

---

## 🔒 Security

- The new Conviction contracts use [OpenZeppelin](https://www.openzeppelin.com/contracts) primitives (`ERC721`, `ReentrancyGuard`, `Pausable`, `AccessControlDefaultAdminRules`); the delayed default-admin transfer is 48 hours.
- CVP transfers carry the position's remaining principal and age. Approved operators can transfer NFTs but cannot withdraw; only the current owner can withdraw.
- A separate guardian role can pause new deposits; only the default admin can resume them. Withdrawals and CVP transfers remain available while paused.
- The legacy `stETH` token is non-transferable; this restriction applies only to the old receipt token.
- This codebase has **not yet undergone a formal third-party audit**. Use on mainnet at your own risk until an audit report is published here.

If you discover a security vulnerability, please **do not** open a public issue — report it privately to the author (see [Contact](#-author--contact)).

---

## 🤝 Contributing

Contributions are welcome. To propose a change:

1. Fork the repository and create a feature branch.
2. Make your changes, following the existing code style.
3. Add or update tests to cover your change (`forge coverage` should not regress).
4. Open a pull request describing the change and its motivation.

Please open an issue first for significant changes so they can be discussed before implementation.

---

## 📄 License

This project is licensed under the **MIT License** — see [`LICENSE`](./LICENSE) for details.

---

## 👤 Author & Contact

**Lintar Ar' Rafii**

- GitHub: [@Rafiitarse](https://github.com/Rafiitarse)
- Repository: [time-weighted-staking-vault](https://github.com/Rafiitarse/time-weighted-staking-vault)
- LinkedIn: [Lintararrafii](https://www.linkedin.com/in/lintararrafii22)
- X: [@Arrafiilintar](https://x.com/@Arrafiilintar)

<div align="center">

*Built with precision for the future of decentralized finance.*

</div>

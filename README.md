<div align="center">

# 🚀 Time-Weighted ETH Staking Vault

**A time-weighted Ethereum staking protocol that rewards long-term conviction, not short-term capital.**

Built with Solidity and Foundry, the vault tracks every deposit as an individually-aged position (`DepositLot`) and scales yield multipliers based on precisely how long that position has been held — from 0% before 6 months up to 40% at 3+ years.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![Framework](https://img.shields.io/badge/Framework-Foundry-D64023?style=flat-square)](https://getfoundry.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![Coverage](https://codecov.io/gh/Rafiitarse/time-weighted-staking-vault/branch/main/graph/badge.svg)](https://codecov.io/gh/Rafiitarse/time-weighted-staking-vault)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Rafiitarse/time-weighted-staking-vault/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Rafiitarse/time-weighted-staking-vault/actions)

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

Traditional staking protocols pool user deposits together, averaging out deposit times. This makes it structurally impossible to reward long-term stakers fairly — a deposit made yesterday earns the same yield as one held for three years.

The **Time-Weighted Staking Vault** solves this with a **lot-based staking model**. Every deposit creates a dedicated `DepositLot`, recording its exact amount and timestamp on-chain. On withdrawal, the protocol computes that specific lot's maturity and mints **Reward Tokens (`RWD`)** according to a time-weighted yield multiplier — entirely independent of any other lot the user owns.

To represent an open position, the vault issues **Staked ETH Receipts (`stETH`)**. These receipts are intentionally non-transferable (soulbound-style), so positions cannot be traded on secondary markets to farm yield or dilute protocol rewards.

---

## 🎯 Problems Solved

| # | Problem | Solution |
|---|---|---|
| 1 | **Time dilution** — depositing additional funds resets or averages down the age of a user's original stake. | **Lot-based tracking.** Each deposit is isolated into its own `DepositLot`, so adding to a position never resets the maturity of earlier deposits. |
| 2 | **Secondary-market depegging** — liquid staking receipts get traded or dumped on DEXs, causing depegs and yield-farming exploits. | **Restricted transferability.** `stETH` minting/burning is locked to the vault contract; transfers are blocked, preserving a strict 1:1 backing with locked ETH. |
| 3 | **Mercenary capital** — flash loans or short-term stakes used to capture rewards without genuine commitment. | **Tiered maturity.** Rewards only begin accruing after a minimum 183-day holding period, aligning incentives with long-term supporters. |

---

## ✨ Key Features

- **Individual Deposit Lots** — each lot packs `amount` (`uint128`) and `timestamp` (`uint64`) for gas-efficient storage.
- **Time-Weighted Yield** — reward multipliers scale from **15%** at 6 months up to **40%** at 3+ years.
- **Soulbound Receipts (`stETH`)** — non-transferable receipt tokens guarantee strict 1:1 accounting integrity.
- **Partial Withdrawals** — withdraw a fraction of a lot without disturbing the maturity timestamp of the remaining balance.
- **Full On-Chain Indexing** — every deposit, withdrawal, and reward event is queryable via the companion [subgraph](./subgraph/README.md).
- **Enterprise-Grade Security** — built on OpenZeppelin's `ReentrancyGuard`, `Pausable`, and `Ownable`.

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
│   ├── lcov.info
│   ├── lib
│   │   ├── forge-std
│   │   └── openzeppelin-contracts
│   ├── remappings.txt
│   ├── script
│   │   └── DeployStakingVault.s.sol
│   ├── src
│   │   ├── ReceiptToken.sol
│   │   ├── RewardToken.sol
│   │   └── StakingVault.sol
│   └── test
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
│   │   ├── Analytics.tsx:Zone.Identifier
│   │   ├── DepositCard.tsx
│   │   ├── DepositCard.tsx:Zone.Identifier
│   │   ├── Navbar.tsx
│   │   ├── Navbar.tsx:Zone.Identifier
│   │   ├── UserLotsList.tsx
│   │   ├── UserLotsList.tsx:Zone.Identifier
│   │   ├── contract.ts:Zone.Identifier
│   │   ├── providers.tsx:Zone.Identifier
│   │   ├── toast.tsx:Zone.Identifier
│   │   └── utils.ts:Zone.Identifier
│   ├── eslint.config.mjs
│   ├── lib
│   │   ├── contract.ts
│   │   ├── providers.tsx
│   │   ├── toast.tsx
│   │   └── utils.ts
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── public
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   └── tsconfig.json
└── subgraph
    ├── README.md
    └── staking-vault
        ├── abis
        ├── build
        ├── docker-compose.yml
        ├── generated
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
| **`StakingVault.sol`** | Core engine | Handles ETH deposits, partial/full withdrawals, and lot accounting. Calculates age-based reward multipliers and orchestrates token minting/burning. |
| **`ReceiptToken.sol`** (`stETH`) | Position receipt | Non-transferable ERC-20 representing a staked ETH position. Mint/burn restricted to the vault. |
| **`RewardToken.sol`** (`RWD`) | Yield token | Standard ERC-20 minted directly to users on qualifying withdrawals. |

---

## 📊 Reward Multiplier Tiers

Rewards are calculated based on the precise holding duration of the specific lot being withdrawn from — **not** the user's account age.

| Holding Period | Age (Days) | Multiplier (‰) | Effective Yield |
|---|---|---|---|
| < 6 months | 0 – 182 | 0 | 0% |
| 6 months | 183 – 365 | 150 | 15% |
| 1 year | 366 – 548 | 200 | 20% |
| 1.5 years | 549 – 731 | 250 | 25% |
| 2 years | 732 – 914 | 300 | 30% |
| 2.5 years | 915 – 1,097 | 350 | 35% |
| 3+ years | 1,098+ | 400 | 40% |

**Formula:**

```
Total Reward = (Withdrawn Amount × Multiplier) / 1000
```

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
git clone https://github.com/Rafiitarse/time-weighted-staking-vault.git
cd time-weighted-staking-vault/contracts

# 2. Install dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# 3. Generate remappings
forge remappings > remappings.txt

# 4. Compile contracts
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

Deploy to a local Anvil instance or a live testnet using the Foundry deployment script. Run this from the repository root, or use `--root contracts` as shown below.

1. Create a `.env` file inside `contracts/` with the following variables:

```bash
SEPOLIA_RPC_URL=
PRIVATE_KEY=
ETHERSCAN_API_KEY=
```

2. Run the deployment script:

```bash
forge script contracts/script/DeployStakingVault.s.sol:DeployStakingVault \
  --root contracts \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

Once deployed, update the contract `address` and `startBlock` in [`subgraph/subgraph.yaml`](./subgraph/subgraph.yaml) and redeploy the subgraph — see the [subgraph README](./subgraph/README.md#build--deployment) for details.

---

## 🔒 Security

- Built on audited [OpenZeppelin](https://www.openzeppelin.com/contracts) primitives (`ReentrancyGuard`, `Pausable`, `Ownable`).
- `stETH` transfers are hard-blocked at the token level to prevent secondary-market exploits.
- `pause()` / `unpause()` allow the owner to halt deposits and withdrawals in an emergency.
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
- Linkedln: [Lintararrafii](https://www.linkedin.com/in/lintararrafii22)
- X: [@Arrafiilintar](https://x.com/@Arrafiilintar)

<div align="center">

*Built with precision for the future of decentralized finance.*

</div>

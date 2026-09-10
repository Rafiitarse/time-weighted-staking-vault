```markdown
# 🚀 Time-Weighted ETH Staking Vault Ecosystem

A robust, time-weighted Ethereum staking vault built with Solidity and Foundry. Designed for long-term yield generation, this protocol rewards long-term holders by tracking individual deposit lots and scaling yield multipliers based on the precise age of each staked position.
```

![Smart Contracts](https://img.shields.io/badge/Smart_Contracts-Solidity_v0.8.27-363636?style=flat-square&logo=solidity)
![Framework](https://img.shields.io/badge/Framework-Foundry-D64023?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

![Coverage](https://codecov.io/gh/https:/Rafiitarse/time-weighted-staking-vault/branch/main/graph/badge.svg)

**Author:** **Lintar Ar' Rafii**
```
```
## 🧭 Quick Navigation
- [Core Smart Contracts](./README.md)
- [Frontend dApp Integration](./frontend/README.md)
- [Subgraph & Data Indexing](./subgraph/README.md)

---

## 📖 Overview

Traditional staking protocols often aggregate user deposits into a single pool, averaging out deposit times and making it difficult to reward long-term stakers fairly. 

The **Time-Weighted Staking Vault** solves this by implementing a **Lot-Based Staking System**. Every time a user deposits ETH, a dedicated `DepositLot` is created, recording the exact amount and timestamp. Upon withdrawal, the protocol calculates the precise maturity of that lot and mints **Reward Tokens (RWD)** based on a time-weighted yield multiplier.

To represent the staked position, the vault issues **Staked ETH Receipts (stETH)**. These receipt tokens act similarly to Soulbound Tokens (SBTs) with non-transferable mechanics, ensuring positions cannot be traded on secondary markets to farm rewards or dilute protocol yield.

---

## 🎯 Problems Solved

1. **The "Time-Dilution" Problem:**
   - *Problem:* In standard staking vaults, depositing additional funds resets or dilutes the time-weight of a user's original stake.
   - *Solution:* **Lot-Based Tracking**. By isolating each deposit into a unique `DepositLot`, users can continuously add to their position without resetting the age of older deposits.

2. **Secondary Market Dumping & Depegging:**
   - *Problem:* Liquid staking receipts are often traded or dumped on DEXs, causing depegging and yield farming exploits.
   - *Solution:* **Restricted Transferability (SBT Behavior)**. `stETH` minting and burning are strictly locked to the Vault. Transfers are blocked to preserve a 1:1 backing with locked ETH.

3. **Yield Exploitation (Mercenary Capital):**
   - *Problem:* Flash-loans or short-term staking used to capture quick yield rewards.
   - *Solution:* **Tiered Maturity**. Rewards require a minimum 183-day holding period, aligning incentives with long-term protocol supporters.

---

## ✨ Key Features

- **Individual Deposit Lots:** Records `amount` (`uint128`) and `timestamp` (`uint64`) per deposit for efficient storage gas optimization.
- **Time-Weighted Yield:** Dynamic yield multipliers scaling from 15% (6 months) up to 40% (3+ years).
- **Soulbound Receipts (`stETH`):** Locked receipt tokens to guarantee strict accounting integrity.
- **Partial Withdrawals:** Withdraw fractions of a specific lot without altering the maturity timestamp of the remaining stake.
- **Enterprise-Grade Security:** Built with OpenZeppelin's `ReentrancyGuard`, `Pausable`, and `Ownable`.

---

## 🏗️ Architecture & Monorepo Structure

This project is organized as a **Monorepo** keeping the core smart contracts, off-chain indexing services, and frontend applications synced.

```text
.
├── contracts/        # Foundry-based Smart Contracts & Test Suite (🟢 Active)
├── subgraph/         # The Graph Indexer for on-chain events (🚧 Coming Soon)
└── frontend/         # Web3 Web Application UI (🚧 Coming Soon)

```

### 📜 Smart Contracts Breakdown

1. **`StakingVault.sol` (Core Engine)**
* Handles ETH deposits, partial/full withdrawals, and lot accounting.
* Calculates age-based reward multipliers and orchestrates token minting/burning.


2. **`ReceiptToken.sol` (`stETH`)**
* Non-transferable ERC-20 receipt token representing staked ETH positions.


3. **`RewardToken.sol` (`RWD`)**
* ERC-20 reward token minted directly to users upon qualifying withdrawals.



---

## 📊 Reward Multiplier Tiers

Rewards are calculated based on the precise holding duration of the withdrawn lot:

| Holding Period | Age (Days) | Multiplier (in thousandths) | Reward Yield |
| --- | --- | --- | --- |
| < 6 Months | 0 - 182 | 0 | 0% |
| 6 Months | 183 - 365 | 150 | 15% |
| 1 Year | 366 - 548 | 200 | 20% |
| 1.5 Years | 549 - 731 | 250 | 25% |
| 2 Years | 732 - 914 | 300 | 30% |
| 2.5 Years | 915 - 1097 | 350 | 35% |
| 3+ Years | 1098+ | 400 | 40% |

*Formula:* `Total Reward = (Withdrawn Amount * Multiplier) / 1000`

---

## 🛠️ Getting Started

### Prerequisites

Ensure you have [Foundry](https://getfoundry.sh/) installed:

```bash
curl -L [https://foundry.paradigm.xyz](https://foundry.paradigm.xyz) | bash
foundryup

```

### Installation & Compilation

1. **Create New Project**
```bash
forge init your-name-project
cd your-name-project
```

2. **Clone the repository:**
```bash
git clone https://github.com/Rafiitarse/time-weighted-staking-vault.git

```
3. **Install dependencies:**
```bash
forge install OpenZeppelin/openzeppelin-contracts --no-commit

```
4. **Remappings Libs**
```bash
forge remappings > remappings.txt

```

5. **Compile contracts:**
```bash
forge build

```



### Testing & Coverage

Run the unit and integration test suites:

```bash
# Run all tests
forge test

# Run tests with detailed traces & gas reports
forge test -vvv --gas-report

# Generate test coverage report
forge coverage

```

### Deployment

Deploy contracts to a local Anvil instance or testnet using Foundry scripts:
(Ensure you are in the project root directory.)

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

---

*Built with precision for the future of decentralized finance.*

```
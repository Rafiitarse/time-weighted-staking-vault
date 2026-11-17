# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People evaluating the Conviction Vault and ETH holders who use its web dashboard to open, review, transfer, and withdraw Conviction Positions. Existing Sepolia users need a separate legacy surface to review and withdraw positions in the older StakingVault.

## Product Purpose

Explain how the Conviction Vault works and let users interact with the contracts through a connected wallet. Success means a user can understand the maturity bonus and current CVR pool before acting, and can complete a deposit or withdraw a chosen amount of principal.

## Positioning

Each deposit is a transferable CVP position. ETH principal remains withdrawable at any time; a one-time, age-based CVR bonus is paid only when the finite funded distributor can cover it in full.

## Operating Context

The dashboard reads contract state and submits wallet transactions on the selected EVM chain. The current Conviction implementation is not deployed to a public network; local Anvil is the available demo deployment. The existing legacy StakingVault is configured for Sepolia and uses a separate lot-based model.

## Capabilities and Constraints

- Conviction Vault uses CVP ERC-721 positions, CVR ERC-20 rewards, and a separately funded RewardDistributor.
- The maximum CVR supply is 10,000,000 tokens. The one-time bonus tiers range from 0% before 183 days to 15% from 1,098 days; the bonus is not annualized yield or a claim about token value.
- A CVR pool shortage never blocks principal withdrawal. If the distributor cannot pay the complete quote, that withdrawal receives zero CVR and creates no reward debt.
- Only the current CVP owner can withdraw. ETH can be sent to a recipient chosen by that owner; CVR goes to the current owner.
- The contracts are not upgradeable. Deposits stay disabled until the Safe admin configures the distributor.
- The Conviction system and legacy Sepolia system are separate. Do not imply that old positions have migrated or that Conviction contracts are publicly deployed.

## Evidence on Hand

- Approved product and security decisions: `UPGRADE.md`.
- Conviction contract implementation and Foundry suites: `contracts/src/` and `contracts/test/`.
- Legacy Sepolia deployment configuration: `subgraph/staking-vault/subgraph.yaml` and `README.md`.
- No production Conviction deployment addresses, testimonials, redemption value, or independent audit are recorded in this repository.

## Product Principles

- Show on-chain state as the source of truth.
- Explain bonus rate and available pool separately.
- State plainly that principal is withdrawable at any time.
- Keep legacy and Conviction contracts visibly separate.
- Do not present CVR as guaranteed yield or as having a redemption value.

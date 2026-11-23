# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People evaluating the Conviction Vault and ETH holders who use its web dashboard to open, review, and withdraw Conviction Positions. CVP is transferable as an ERC-721, but the dashboard currently has no transfer action. Existing Sepolia users need a separate legacy surface to review and withdraw positions in the older StakingVault.

## Product Purpose

Explain how the Conviction Vault works and let users interact with the contracts through a connected wallet. Success means a user can understand the maturity bonus and current CVR pool before acting, and can complete a deposit or withdraw a chosen amount of principal.

## Positioning

Each deposit is a transferable CVP position. ETH principal remains withdrawable at any time; a one-time, age-based CVR bonus is paid only when the finite funded distributor can cover it in full.

## Operating Context

The dashboard reads contract state and submits wallet transactions on the selected EVM chain. The current Conviction implementation is not deployed to a public network; local Anvil is the demo network. The existing legacy StakingVault is configured for Sepolia and uses a separate lot-based model. The `/admin` route provides read-only metadata and does not submit Safe proposals or privileged transactions.

## Capabilities and Constraints

- Conviction Vault uses CVP ERC-721 positions, CVR ERC-20 rewards, and a separately funded RewardDistributor.
- The maximum CVR supply is 10,000,000 tokens. The one-time bonus tiers range from 0% before 183 days to 15% from 1,098 days; the bonus is not annualized yield or a claim about token value.
- A CVR pool shortage never blocks principal withdrawal. If the distributor cannot pay the complete quote, that withdrawal receives zero CVR and creates no reward debt.
- Only the current CVP owner can withdraw. ETH can be sent to a recipient chosen by that owner; CVR goes to the current owner. CVP transfers use standard ERC-721 wallet interactions; the dashboard does not submit them.
- The contracts are not upgradeable. Deposits stay disabled until the configured admin links the distributor. The vault assigns admin and guardian roles to constructor-supplied addresses and does not verify that they are Safe multisigs; multisig control depends on deploying with the intended Safe addresses.
- The Conviction system and legacy Sepolia system are separate. Do not imply that old positions have migrated or that Conviction contracts are publicly deployed.
- Conviction deployment metadata is a per-network input under `deployments/`; the checked-in Sepolia example has zero addresses and is not deployable or live configuration.

## Evidence on Hand

- Approved product and security decisions: `UPGRADE.md`.
- Conviction contract implementation and Foundry suites: `contracts/src/` and `contracts/test/`.
- Legacy Sepolia deployment configuration: `subgraph/staking-vault/subgraph.yaml` and `README.md`.
- No production Conviction deployment addresses, testimonials, redemption value, or independent audit are recorded in this repository.
- Stage 6 frontend/subgraph integration was reviewed and approved by the user on 2026-11-17. Stage 7 release verification and testnet rollout remain not started (`UPGRADE.md`). The integrated runtime baseline is `3778847` on `origin/dev`; `main` remains the legacy-only base.
- The local production-browser design gate passed on 2026-11-17 with zero failures and 19 non-blocking warnings. A dedicated screen-reader review has not been run; the gate result is not release verification.

## Product Principles

- Show on-chain state as the source of truth.
- Explain bonus rate and available pool separately.
- State plainly that principal is withdrawable at any time.
- Keep legacy and Conviction contracts visibly separate.
- Do not present CVR as guaranteed yield or as having a redemption value.

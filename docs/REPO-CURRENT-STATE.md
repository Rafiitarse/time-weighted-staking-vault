# Repository state and deployment readiness

Checked 2026-11-17 on `vault-documentation`, based on the Stage 6 integration at `frontend-redesign` / `origin/dev` (`47f4f923`). This report describes the integrated checkout, not the legacy-only `main` branch.

## Integrated systems

| Surface | Legacy StakingVault | Conviction Vault |
|---|---|---|
| Contracts | `StakingVault`, `ReceiptToken` (`stETH`), `RewardToken` (`RWD`) | `ConvictionVault` (CVP positions), `ConvictionRewards` (CVR), `RewardDistributor` |
| Frontend | Sepolia lot manager at `/legacy` | Dashboard at `/`, operator information at `/admin` |
| Subgraph | `subgraph/staking-vault/`, manifest uses Sepolia address `0x4EbF2EE5753F729F1D8C166BA36783eD35ab48Bf` and start block `11674936` | `subgraph/conviction-vault/`, separate CVP/CVR event mapping and tests; manifest is rendered from shared deployment metadata |
| Deployment status | Repository configuration points to Sepolia; live contract and indexer health were not rechecked in this documentation task | No public deployment or published Conviction subgraph is recorded |

The legacy address and block are configuration values, not confirmation of current bytecode, RPC health, or indexer synchronization. Conviction example metadata uses zero addresses for local build/test validation and is not deployable configuration.

## Conviction reward behavior

CVP is a transferable position NFT. Each position tracks its own maturity; partial withdrawal keeps the original timestamp and full withdrawal burns the position. ETH principal can be withdrawn at any time. Maturity changes eligibility for a one-time CVR bonus on the principal withdrawn; the bonus is not APY, interest, or guaranteed value.

| Position age | Bonus |
|---|---:|
| Under 183 days | 0% |
| 183 days | 2.5% |
| 366 days | 5% |
| 549 days | 7.5% |
| 732 days | 10% |
| 915 days | 12.5% |
| 1,098 days or more | 15% |

CVR supply is fixed at 10,000,000 tokens. Rewards come from a separately funded, limited pool. If the distributor cannot pay the full quote or its call fails, the withdrawal can return principal with zero CVR and no reward debt. Deposits remain disabled until the Safe admin configures the distributor.

## Verification evidence

- Stage 5 contract verification recorded 75 passing Foundry tests, including fuzz and stateful invariant coverage (128,000 calls).
- Stage 6 recorded 42 passing frontend tests, successful frontend lint and production build, and passing legacy and Conviction subgraph generation/build/test workflows.
- On 2026-11-17, the local production-browser design gate reported `GATE: PASS`, zero failures and 19 non-blocking warnings. This is local UI evidence; a screen-reader review was not performed.
- The GitLab pipeline on this branch runs frontend lint/tests/build, Foundry build/tests/coverage, and both subgraph test/build workflows. Its manual deploy jobs currently target the legacy system.

These checks do not establish a public Conviction deployment, live wallet transaction behavior, external audit status, or current legacy RPC/subgraph health.

## Readiness

- **Frontend:** local production build and design gate passed. Conviction transaction flows still require valid deployment metadata and a matching live deployment.
- **Contracts:** Conviction unit, fuzz, and invariant test evidence is recorded; no public Conviction deployment is configured. The repository has no formal third-party audit report.
- **Subgraphs:** both source packages and checks are present. The Conviction subgraph is not published; the legacy manifest does not prove a currently healthy indexer.
- **Release:** Stage 6 is complete and awaiting user review. Stage 7 release verification and testnet rollout remain not started.

## Documentation entry points

- [Project overview](../README.md)
- [Frontend setup and behavior](../frontend/README.md)
- [Local Conviction demo](../frontend/DEMO.md)
- [Subgraph schemas and workflows](../subgraph/README.md)

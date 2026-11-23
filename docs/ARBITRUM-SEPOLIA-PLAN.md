# Arbitrum Sepolia buildathon plan

**Status:** Planning only. The Conviction contracts, frontend, and subgraph are integrated on `vault-documentation` at revision `13fb726` (same as the checked `origin/dev`); `main` remains legacy-only. No Conviction deployment to Arbitrum Sepolia is recorded. Stage 7 remains `[ ] NOT STARTED`. This document does not authorize starting rollout work or broadcasting a deployment by itself.

## Stage 7 phases and seven-day preparation tracker

Stage 7 is the rollout stage in `UPGRADE.md`. Its execution is divided into six ordered phases in this document: **Phase 0** confirm project and source; **Phase 1** implement and verify network support; **Phase 2** prepare deployment inputs; **Phase 3** deploy and configure; **Phase 4** integrate app/indexing and gather demo evidence; **Phase 5** close Stage 7 for user review. These phases do not change the roadmap stage status until the user explicitly asks to begin rollout work.

The separate seven-day preparation plan is a readiness exercise, not a second numbering system for Stage 7:

| Preparation day | Focus | Status |
|---|---|---|
| 1 | Validate the buildathon objective, rules, current repository fit, and source revision | Complete — checked 2026-11-23 |
| 2 | Select the project scope and a substantial user-facing change | Planned |
| 3 | Turn the selected scope into technical design and acceptance criteria | Planned |
| 4 | Prepare Arbitrum Sepolia network, metadata, and wallet support | Planned; only after explicit Stage 7 request |
| 5 | Verify contract, frontend, indexing, and CI paths | Planned; only after explicit Stage 7 request |
| 6 | Walk through the testnet demo and collect evidence | Planned; requires a separately reviewed deployment |
| 7 | Prepare and submit the project package | Planned; recheck live submission requirements |

Day 1 confirms Conviction Vault as the **recommended candidate**, not as a final project selection on the user's behalf. The repo already has Solidity contracts, a frontend, a subgraph, and local test evidence. HackQuest permits an existing project only when it is adjusted during the Buildathon with more than trivial codebase development, and requires a functional, demonstrable deployment on an accepted Arbitrum chain. Therefore, chain configuration and deployment alone are not a sufficient planned contribution. A meaningful dashboard capability such as CVP transfer handling is a candidate for Day 2 scope selection; it is not approved implementation scope yet.

## Buildathon objective and rules checked 2026-11-23

The official event is hosted by the Arbitrum Foundation, is online, accepts Solidity and Rust, and welcomes participants globally subject to the eligibility exclusions in the terms. Participants must be at least 18; sanctioned persons/jurisdictions and certain organizer, sponsor, judge, and family members are excluded. Registration does not guarantee acceptance.

Submission requirements include compliance with applicable law, original work or an existing project changed during the event with more than trivial codebase work, deployment to Arbitrum Sepolia, Arbitrum One, or a custom Orbit Chain, required documentation/access information, and a functional demo submitted on time. Arbitrum Sepolia is an accepted test network. Judging includes smart-contract quality, Arbitrum usage, product-market fit, innovation, real problem solving, impact, and presentation. The event page gives additional consideration to projects integrating Paxos USDG; this is an incentive, not an eligibility requirement, and does not by itself justify changing Conviction's approved token design.

The live page lists registration from 2026-11-02 03:01 through 2027-03-01 02:59, submissions from 2027-02-08 03:01 through 2027-03-01 02:59, and a reward announcement on 2027-03-08 17:00. The official terms specify the submission deadline as 2027-02-28 23:59 BRT, equivalent to 2027-03-01 02:59 UTC. Recheck the schedule before registration/submission because the organizers may change it.

The event page advertises prizes in USDC, while the official terms PDF describes the overall and Promising Products prizes and milestone grants in USDG. Treat the payment currency as unresolved and confirm it with the organizers before relying on prize details. The terms also require prize recipients to sign a grant agreement; for prize categories other than Promising Products, they describe staged payment conditions including an Arbitrum mainnet launch, mutually agreed KPIs, and Foundation investment rights. These prize conditions do not authorize mainnet work under this plan: mainnet remains out of scope and requires a separate explicit request. Participants retain their work but grant organizers, sponsors, and service providers a promotional license; the terms also permit use of participant likeness and sharing contact details with partners.

**Day 1 outcome:** keep Conviction Vault as the leading candidate, retain Arbitrum Sepolia as the proposed testnet, and carry the need for a substantive Buildathon change into Day 2. Final project/scope selection remains for the user. No contract, frontend, network, deployment, registration, or submission action was taken in Day 1.

## Goal and scope

Prepare the integrated Conviction Vault system for a hackathon demo on **Arbitrum Sepolia**, chain ID **421614**. The candidate consists of `ConvictionVault`, `ConvictionRewards`, `RewardDistributor`, the Conviction frontend, and its subgraph. Confirm the exact current source branch and contract revision before implementation; `main` is the legacy-only base, while this documentation branch includes Conviction integrations.

The existing legacy deployment is on **Ethereum Sepolia**, chain ID **11155111**. It is a separate system and does not qualify as an Arbitrum deployment. Keep its addresses, metadata, frontend route, and indexer configuration intact. The Arbitrum work must use its own named deployment metadata, RPC configuration, frontend network selection, and indexer configuration.

The HackQuest page and official terms were checked on November 23, 2026. Existing projects are allowed if they receive more than trivial codebase development during the Buildathon; submissions must be functional, demonstrable, documented, and deployed on an accepted Arbitrum chain. The live schedule currently lists registration through March 1, 2027 and submissions February 8–March 1, 2027; the terms specify the deadline as February 28 at 11:59 PM BRT (March 1 at 02:59 UTC). The page and terms disagree on prize currency (USDC vs USDG). Recheck the live [event page](https://www.hackquest.io/hackathons/Arbitrum-Open-House-Sao-Paulo-Online-Buildathon) and [official terms](https://openhouse.arbitrum.io/sao_paulo_version_open_house_buildathon_terms_and_conditions.pdf) before relying on rules, dates, or prize details.

## Chain facts

Use the official [Arbitrum chain information](https://docs.arbitrum.io/chain-info) as the canonical source and recheck it immediately before deployment:

| Setting | Arbitrum Sepolia |
|---|---|
| Chain ID | `421614` (`0x66eee`) |
| Native gas token | Testnet ETH (wallet symbol `ETH`) |
| Official public RPC | `https://sepolia-rollup.arbitrum.io/rpc` |
| Explorer | `https://sepolia.arbiscan.io` |
| Parent chain | Ethereum Sepolia |

The official public RPC is a no-key starting option, subject to availability and rate limits. A dedicated RPC provider is optional; request its endpoint/API key only if the public endpoint is inadequate or the chosen deployment/indexing workflow requires it. Obtain Arbitrum Sepolia test ETH from a faucet. Ethereum Sepolia ETH and Arbitrum Sepolia ETH are on different chains; bridge only if using a faucet/path that requires it.

## Repository guardrails for every agent

1. Read the full root `UPGRADE.md` and this plan before changing deployment, network, frontend, or subgraph files. Follow the current `AGENTS.md` rules and verify branch refs and working-tree state.
2. Treat this document as a plan, not as permission to start a roadmap stage or broadcast transactions. Stage 6 is approved; Stage 7 remains `NOT STARTED` until the user explicitly asks to start rollout work. When Stage 7 begins, update its status as required by `UPGRADE.md`, complete only that stage, report evidence, then stop for review.
3. Before changing tracked files, follow the repository's branch rule and verify the branch's ancestry, refs, and worktree. `main` is the legacy-only base; the integrated Conviction sources are on the current integrated line. Do not switch to or deploy from `main` for the Conviction rollout, overwrite either system, or merge branches automatically. Work from the exact reviewed Conviction revision.
4. Do not alter, replace, migrate, or relabel the Ethereum Sepolia legacy deployment. Do not put Arbitrum addresses into `deployments/legacy-sepolia.json` or change legacy routes/indexing to point at Conviction.
5. Keep secrets out of source, metadata, logs, screenshots, commits, and chat. Never ask the user to paste a private key, seed phrase, RPC secret, explorer key, or indexer deploy key into a conversation. At the phase that needs one, explain the purpose and ask the user to configure it locally in an ignored environment file or protected CI variable. Verify ignore rules before creating that file.
6. Ask for public addresses and decisions only when they become necessary. Addresses such as deployer, treasury, Safe admin, and guardian are not secrets, but must be confirmed before deployment because they are written immutably into contracts or deployment metadata. Do not invent or reuse local-demo addresses.
7. A successful contract deployment is not a complete hackathon-ready application. Verify source, constructor roles, Safe configuration, funding, frontend chain selection, and (if used) the indexer's start block and endpoint against the actual deployment.
8. Never deploy to Arbitrum One or another mainnet as part of this plan. Any mainnet work needs a separate explicit request and review.

## Work sequence and inputs

### Phase 0 — Confirm the project and source revision

- Recheck HackQuest eligibility, submission format, dates, and any project-origin requirements on its live page.
- Confirm Conviction Vault is the selected hackathon project and identify the exact integrated source branch/commit. `main` is legacy-only; the candidate integration was previously on `origin/dev`, but refs can move and must be checked at execution time.
- Review the contract, deployment script, frontend, metadata validation, subgraph renderer, CI, tests, and all current local changes. Confirm there is no existing Arbitrum deployment to preserve or overwrite.
- Decide which wallet will deploy, who controls the Safe admin and guardian, who receives the fixed CVR supply, whether a public frontend is needed for judging, and whether a hosted subgraph is needed. Keep the initial scope to a testnet demo.

**Ask the user now only for decisions needed to scope implementation.** No RPC API key or deployer secret is required for this review phase.

### Phase 1 — Implement and verify chain support

Before deployment, update the integrated source where required:

- Add Arbitrum Sepolia chain ID `421614` and the `arbitrum-sepolia` network name to the Conviction deployment-name/chain validation and wallet/RPC configuration. The inspected deployment script currently auto-names only Anvil (`31337`) and Ethereum Sepolia (`11155111`); it can accept a `NETWORK_NAME` override, but that alone does not prove the frontend and subgraph accept the network.
- Add a distinct `deployments/arbitrum-sepolia.json` output/input path and validation. Preserve `deployments/legacy-sepolia.json` and existing Ethereum Sepolia examples untouched. Never copy zero-address example metadata into a deployable file.
- Make the frontend clearly select Arbitrum Sepolia for Conviction, use the matching chain ID/RPC, show correct explorer links, and reject metadata/chain mismatches. Keep legacy wallet transactions on Ethereum Sepolia.
- Make the Conviction subgraph manifest renderer accept the canonical Arbitrum metadata and the selected Graph/indexer network name. Do not publish a graph until chain support and provider availability are confirmed.
- Add or update focused tests and CI checks for chain metadata, RPC/network selection, and manifest generation. Run all relevant contract, frontend, and subgraph checks before asking for deployment access.

At this stage, an RPC URL is useful for public read-only connectivity checks. The official public endpoint can be used without a credential. If selecting a vendor endpoint, ask the user for a locally configured RPC URL/API key now, and only if needed.

### Phase 2 — Prepare deployment inputs (no broadcast until confirmed)

Required decisions and values for the Conviction deployment script:

| Input | Why needed | When to ask |
|---|---|---|
| `TREASURY` public address | Receives the fixed 10,000,000 CVR supply at deployment | Before final deployment review |
| `SAFE_ADMIN` public address | Initial delayed default admin; must configure the RewardDistributor | Before final deployment review |
| `GUARDIAN` public address | Can pause new deposits | Before final deployment review |
| `PRIVATE_KEY` for the deployer | Signs contract deployment transactions | Only after code, chain, addresses, and estimated testnet gas are reviewed and user chooses deployer; configure locally, never send in chat |
| `ARB_SEPOLIA_RPC_URL` (or the actual variable/CLI form used by the chosen script) | Connects Foundry to chain ID 421614 | Use official public RPC first; ask for provider endpoint/key only if user chooses one or limits require it |
| Arbitrum Sepolia test ETH | Pays deployment and configuration gas | Before deployment; ask user to fund the deployer from a faucet, then verify balance |
| Explorer verification API key | May be needed by the selected source-verification workflow | Only after deployment and only if the selected verifier requires a key; configure locally/protected CI |
| Subgraph/indexer account and deploy key | Needed only if publishing a hosted Conviction subgraph | After contracts and metadata are verified, and only if hosted indexing is selected |
| Frontend hosting credentials/domain | Needed only for public hosting; not for local demo or on-chain deployment | After the testnet app works locally and only if the user chooses to publish it |

The private key must belong to a dedicated testnet deployer account with no mainnet funds or authority. A hardware wallet or controlled broadcast process may be preferred if the deployment workflow supports it. Do not reuse the local Anvil mnemonic/private keys. Store secrets in an ignored `contracts/.env` or protected CI variables, check that they are ignored, and do not add `.env` files to Git.

Before broadcast, show the user the exact chain ID, deployment command, contract constructors/role addresses, testnet gas estimate, and expected outputs. Require an explicit go-ahead for the deployment transaction. This is a review point, not an implicit consent from this plan.

### Phase 3 — Deploy and configure Conviction on Arbitrum Sepolia

- Confirm RPC reports chain ID `421614`, deployer address matches the user's intended test wallet, and sufficient test ETH is available.
- Run the reviewed Conviction deployment script from the integrated contracts revision. It deploys CVR, `ConvictionVault`, and `RewardDistributor` in the documented order and writes canonical metadata. Use network name `arbitrum-sepolia` and a dedicated deployments directory/path. Do not deploy the legacy `StakingVault` just to satisfy the hackathon rule.
- Record transaction hashes, deployer, block numbers, addresses, constructor/immutable references, and source revision. Check the written metadata against chain state. Deposits must remain disabled until the admin configures the distributor.
- Have the confirmed Safe admin configure the vault with the deployed distributor, then verify the vault/distributor/token references and that deposits are enabled. Fund the distributor with CVR through the approved flow; verify the token balance and full-or-zero payout behavior.
- Verify source code and constructor parameters on Arbiscan or an equivalent explorer if supported by the workflow. Treat a verified explorer page as evidence, not as a substitute for on-chain checks.

The deployment script currently expects `PRIVATE_KEY`, `TREASURY`, `SAFE_ADMIN`, and `GUARDIAN`. Confirm those names against the exact source revision before use; network/RPC and verification flags may differ by Foundry and verifier configuration.

### Phase 4 — Integrate app, indexing, and demo evidence

- Load the Arbitrum deployment metadata in the frontend and confirm wallet chain ID, contract addresses, RPC reads, write transactions, receipts, and explorer links all point to Arbitrum Sepolia.
- Test a small deposit, position discovery, transfer if included in the demo, partial withdrawal, full withdrawal, funded reward, underfunded reward, paused deposit, and withdrawal while deposits are paused. Use only testnet assets.
- If a public subgraph is chosen, confirm the provider supports Arbitrum Sepolia, render its manifest from the canonical metadata, use the actual deployment start block, publish only after tests/builds pass, and verify indexed events against chain receipts. The subgraph is optional if another reliable discovery approach supports the demo.
- A public frontend is optional for on-chain eligibility but useful for judging. Do not request hosting credentials unless the user chooses a host and the local production build is ready.
- Prepare a submission package: concise project description, source repository/commit, demo URL or clear run instructions, Arbitrum Sepolia chain ID, verified contract addresses/explorer links, transaction walkthrough, known limitations, and demo video/screenshots if required by current HackQuest rules.

### Phase 5 — Close Stage 7 for review

Report exactly what was deployed and tested, with links and transaction evidence; list failed or untested items honestly; update canonical deployment metadata and user-facing docs; document recovery/incident limits and remaining risks. Mark Stage 7 `COMPLETE - AWAITING USER REVIEW` only when its completion criteria in `UPGRADE.md` are met, then stop. Do not begin mainnet deployment or another upgrade stage automatically.

## Credential timing summary

- **Now / planning and source review:** no secrets. Public chain facts and public addresses only.
- **Implementation and RPC smoke checks:** public RPC works without an API key. Ask for a provider key only if the user chooses a vendor endpoint or practical limits require it.
- **Immediately before the user-approved deploy:** need locally configured deployer private key and testnet ETH, plus confirmed treasury/Safe/guardian addresses. Never request the key in chat.
- **After deployment:** explorer key only if required by chosen verification tooling; subgraph token only if the user chooses hosted indexing; hosting credentials only if the user chooses public frontend hosting.

## Verified references

- [HackQuest event page](https://www.hackquest.io/hackathons/Arbitrum-Open-House-Sao-Paulo-Online-Buildathon) — eligibility, tracks, and schedule; recheck before submission.
- [Official Arbitrum chain information](https://docs.arbitrum.io/chain-info) — RPC, chain ID, explorer, and faucet references; recheck before deployment.
- [Official Arbitrum Solidity quickstart](https://docs.arbitrum.io/build-decentralized-apps/quickstart-solidity-remix) — network setup and testnet ETH context.

# Legacy StakingVault Subgraph

This page documents the legacy `StakingVault` subgraph. The separate Conviction subgraph template is documented at the end of this file.

## Current manifest configuration

The manifest at [`staking-vault/subgraph.yaml`](./staking-vault/subgraph.yaml) is configured for:

| Setting | Value |
|---|---|
| Network | Sepolia |
| Data source | `StakingVault` |
| Contract address | `0x4EbF2EE5753F729F1D8C166BA36783eD35ab48Bf` |
| Start block | `11674936` |
| Graph spec version | `1.3.0` |
| Mapping API version | `0.0.9` |
| Mapping language | AssemblyScript |

These are manifest values, not confirmation that the target deployment or an indexed subgraph endpoint is available. The manifest's `repository` metadata is currently a placeholder (`https://github.com/your-org/staking-vault-subgraph`).

## What is indexed

The mapping in [`staking-vault/src/staking-vault.ts`](./staking-vault/src/staking-vault.ts) handles three events:

| Event | Handler | Effect |
|---|---|---|
| `Deposited` | `handleDeposited` | Creates or updates a `User`, creates a `DepositLot`, and increments cumulative deposit and lot counts. |
| `Withdrawn` | `handleWithdrawn` | Reduces a lot's remaining amount, records a `LotWithdrawal`, and increments cumulative reward totals from the event. |
| `TokensSet` | `handleTokensSet` | Stores the legacy receipt and reward token addresses in `ProtocolStat`. |

The subgraph follows the legacy contract's user-owned lot model. It does not track transferable position ownership. The schema is in [`staking-vault/schema.graphql`](./staking-vault/schema.graphql).

### Entities

- **`User`** — wallet-address ID, cumulative ETH deposits, cumulative rewards, derived lots and withdrawals.
- **`DepositLot`** — ID formed from `{userAddress}-{lotId}`; original amount, remaining amount, deposit timestamp, and `ACTIVE`/`CLOSED` status.
- **`LotWithdrawal`** — immutable withdrawal record keyed by transaction hash and log index.
- **`ProtocolStat`** — singleton with ID `global`; cumulative ETH deposited, cumulative rewards recorded, lot count, and configured legacy token addresses.

`totalEthStaked` and `totalEthStakedAllUsers` are cumulative deposits and do not decrease on withdrawals. To estimate current indexed principal, sum `remainingAmount` over active lots. The mapping records reward values emitted by the legacy contract; these are not CVR payouts.

## Build and test

Use Node.js and npm from the subgraph package directory:

```bash
cd subgraph/staking-vault
npm ci
npm run check:metadata
npm run codegen
npm run build
npm test
```

`check:metadata` verifies the legacy network, address, and start block against `deployments/legacy-sepolia.json`. The Matchstick suite checks that a deposit creates a lot, user, and protocol totals. On a host without a compatible Matchstick binary, run it with Docker and a TTY (for example `script -qec 'npm test -- --docker' /dev/null`).

The root GitLab CI runs metadata validation, legacy generation/build/test, and Conviction generation/build/test.

## Deploy

The root GitLab pipeline has a manual Studio deployment job for the legacy subgraph. It uses `GRAPH_DEPLOY_KEY` and `SUBGRAPH_SLUG`, runs `graph auth --studio`, and deploys with a version label. No Conviction deployment or subgraph publication is configured. The fixed `deploy` script in the package is separate from the variable-driven GitLab job.

For any legacy redeployment or replacement, update the manifest network, contract address, start block, ABI, and mapping consistently with the target contract before deploying. The package's existing `deploy` script uses a fixed `staking-vault` slug, while the GitLab job uses the `SUBGRAPH_SLUG` variable.

## Query examples

Get one user's cumulative totals and lots:

```graphql
{
  user(id: "0xYOUR_ADDRESS") {
    totalEthStaked
    totalRewardEarned
    lots {
      id
      originalAmount
      remainingAmount
      status
      depositTimestamp
    }
  }
}
```

Get aggregate values:

```graphql
{
  protocolStat(id: "global") {
    totalEthStakedAllUsers
    totalRewardsDistributed
    totalLotsCreated
    receiptToken
    rewardToken
  }
}
```

Amounts are represented as `BigInt` in wei. Convert to ETH/token display units in the client.

## Indexing limitation

Set `startBlock` at or before the legacy vault's relevant deposit history. If a withdrawal is indexed without its deposit event, the mapping logs that the `DepositLot` is missing and cannot reconstruct the lot's remaining amount or status from that withdrawal alone.

## Conviction Vault subgraph template

`conviction-vault/` contains a separate CVP/CVR schema and event mapping. It tracks deposits, ERC-721 ownership transfers, principal withdrawals, paid or skipped rewards, and CVR funding. The Matchstick suite exercises these accounting paths. It is not deployed, and no Conviction subgraph endpoint is published.

The manifest is rendered from the same `deployments/<network>.json` file used by the frontend. For an unconfigured example build, run from `subgraph/staking-vault`:

```bash
DEPLOYMENT_METADATA=../../deployments/sepolia.json.example ALLOW_UNCONFIGURED=1 NETWORK_NAME=sepolia npm run build:conviction
```

The example contains zero addresses and is only for code generation, tests, and build validation. The renderer refuses to prepare a deployable manifest from zero addresses unless `ALLOW_UNCONFIGURED=1` is explicitly supplied. A production manifest requires actual deployment metadata; this repository does not contain public Conviction addresses. Generated manifest, ABI copies, and Graph build output are local build artifacts and are excluded from Git.

The Conviction subgraph has its own `package.json` and lockfile. From `subgraph/conviction-vault`, run `npm ci`, `npm run codegen`, and `npm test`. On hosts without a compatible Matchstick binary, use Docker with a TTY (for example `script -qec 'npm test -- --docker' /dev/null`).

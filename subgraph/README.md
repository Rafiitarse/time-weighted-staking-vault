# Legacy StakingVault Subgraph

This subgraph indexes the legacy `StakingVault` lot-based contract. It does not index the newer Conviction Vault, CVP NFT transfers, CVR, or a RewardDistributor.

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
npm run codegen
npm run build
```

The package also defines `npm test` (`graph test`). Its current Matchstick test is not aligned with the current schema/mapping: it asserts a `Deposited` entity, while the schema and handler create `User`, `DepositLot`, and `ProtocolStat` entities. In this environment, `npm test` also cannot obtain a Matchstick binary for Linux x64; the Graph CLI suggests `graph test -d` where Docker is available. Treat the current subgraph test as needing repair, not as passing verification.

The root GitLab CI runs subgraph `npm ci`, `npm run codegen`, and `npm run build`; it does not run `npm test`.

## Deploy

The root GitLab pipeline has a manual Studio deployment job for the legacy subgraph. It uses `GRAPH_DEPLOY_KEY` and `SUBGRAPH_SLUG`, runs `graph auth --studio`, and deploys with a version label. No deployment of a CVP/CVR subgraph is configured.

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

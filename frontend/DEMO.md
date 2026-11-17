# Conviction Vault demo runbook

One-command demo path from a clean checkout. Every number the app shows comes
from the running Anvil chain — no mock state.

## Test accounts (Anvil defaults, mnemonic `test test test test test test test test test test test junk`)

| Role | Account | Key index |
|---|---|---|
| Deployer | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | 0 |
| Safe admin (demo: plain EOA) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | 1 |
| Deposit guardian | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | 2 |
| CVR treasury | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | 3 |
| Demo user | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | 4 |

## Command order

```sh
# 1. Start the chain (block-time 1 so log-scan indexing is fast).
npm run demo:node

# 2. Deploy the three contracts; writes deployments/anvil.json.
npm run demo:deploy

# 3. Link the distributor (Safe admin) and fund the pool (treasury, full 10M CVR supply).
npm run demo:configure

# 4. Run the app pointed at the demo chain.
NEXT_PUBLIC_DEPLOYMENT=anvil npm run dev
```

## Demo limitations

* The demo "Safe admin" is a **plain EOA** (account 1). Production Safes route
  admin actions through the admin console and the Safe Transaction Service;
  the demo calls the same functions directly.
* The Safe-proposal path is not exercised on Anvil (there is no hosted Safe
  service against a local chain); the admin console falls back to its
  calldata-builder mode, which is also what the demo shows.

## Time travel

```sh
npm run demo:warp -- --days 183   # reach the first tier (2.5% multiplier)
npm run demo:warp -- --days 100   # reach the 5% tier (cumulative ages hold)
```

Warp before or after a deposit — tier age is measured per position from its
`depositedAt` timestamp, so warping after a deposit ages that position too.

## Shortage path (zero-CVR withdrawal that still succeeds)

The reward pool holds the whole 10,000,000 CVR supply by default, so a
shortage needs a fresh, partially funded deployment:

```sh
# stop demo:node, then:
rm deployments/anvil.json && npm run demo:node &
npm run demo:deploy
DEMO_FUNDING=1000ether npm run demo:configure
```

Then from the demo user account deposit e.g. 5000 ETH, warp 183 days, and
withdraw the full amount: the quote (5000 × 25/1000 = 1250 CVR) exceeds the
1000 CVR pool, so the withdrawal succeeds with **zero CVR** and the app shows
the `RewardSkipped` outcome with reason *"Reward pool insufficient"*.
Principal always arrives; rewards are all-or-none per withdrawal.

## Reset

Kill the `demo:node` process, delete `deployments/anvil.json`, and start
`npm run demo:node` again — the chain state and deployment file are regenerated
by `demo:deploy` + `demo:configure`.

## Verification (without the app)

```sh
cast call <rewardDistributor> "availableRewards()(uint256)" --rpc-url http://127.0.0.1:8545
cast call <convictionVault>  "rewardDistributor()(address)"      --rpc-url http://127.0.0.1:8545
```

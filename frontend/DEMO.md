# Conviction Vault local demo

This runbook deploys the Conviction contracts to a local Anvil chain, configures the distributor, funds the CVR pool, and runs the frontend. It does not deploy to Sepolia or any public network.

The scripts use the standard Anvil test mnemonic and hardcoded development private keys. Use them only against the local demo node; never use these keys for real assets.

## Accounts

| Role | Address | Anvil account index |
|---|---|---:|
| Deployer | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | 0 |
| Demo admin (EOA, not a Safe) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | 1 |
| Guardian | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | 2 |
| CVR treasury | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | 3 |
| Demo user | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | 4 |

## Start the demo

Run each command in `frontend/` and keep Anvil running in its own terminal:

```sh
npm run demo:node
```

In a second terminal:

```sh
npm run demo:deploy
npm run demo:configure
```

The deploy step writes `deployments/anvil.json`. Configuration links the distributor and funds the full 10,000,000 CVR supply. In a third terminal, start the frontend:

```sh
NEXT_PUBLIC_DEPLOYMENT=anvil npm run dev
```

Connect a wallet using Anvil account 4 to deposit and test positions. The `/admin` page is informational only; it does not create Safe proposals. Demo configuration uses the admin and treasury EOAs directly through the local script.

## Test a maturity tier

Increase local chain time after a deposit:

```sh
npm run demo:warp -- --days 183
```

The first tier is 2.5%. Time is measured from each position's own deposit timestamp. Anvil time changes affect the local chain only.

## Test a reward-pool shortage

Start from a fresh local chain so the contract addresses and deployment metadata are regenerated. Stop Anvil, then remove the old local metadata file:

```sh
rm ../deployments/anvil.json
```

Restart `npm run demo:node`, then deploy and configure with a smaller pool:

```sh
npm run demo:deploy
DEMO_FUNDING=100000000000000000000 npm run demo:configure
```

Deposit at least 5,000 ETH from the demo wallet, advance 183 days, and withdraw. The quote is 125 CVR (`5,000 × 25 / 1,000`), which exceeds the 100 CVR pool. The withdrawal should return principal and pay zero CVR, with a `RewardSkipped` outcome.

## Reset and inspect

To reset, stop Anvil, remove `../deployments/anvil.json`, and repeat the start sequence. The chain state is in Anvil memory; the metadata file is only the local deployment record.

With Anvil running, inspect the local contracts using Foundry Cast:

```sh
cast call <rewardDistributor> "availableRewards()(uint256)" --rpc-url http://127.0.0.1:8545
cast call <convictionVault> "rewardDistributor()(address)" --rpc-url http://127.0.0.1:8545
```

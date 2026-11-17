// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ConvictionRewards} from "../src/ConvictionRewards.sol";
import {ConvictionVault} from "../src/ConvictionVault.sol";
import {RewardDistributor} from "../src/RewardDistributor.sol";

/// @notice One-time demo configuration for a freshly deployed Conviction stack.
/// @dev Reads the deployment metadata the deploy script emitted
///      (../deployments/anvil.json by default) and performs the two admin
///      steps the production flow needs: linking the distributor from the
///      Safe admin and funding the reward pool from the CVR treasury.
/// @dev Demo limitation: the "Safe admin" is a plain EOA here. Production
///      Safes route through the admin console / Safe Transaction Service.
contract DemoConfigureScript is Script {
    /// @notice CVR the demo treasury sends into the reward pool. Defaults to
    ///         the entire 10,000,000 CVR supply; override for a smaller pool
    ///         (the shortage demo funds less than a quote).
    uint256 constant CVR_TOTAL_SUPPLY = 10_000_000 ether;

    function run() external {
        string memory metadataPath = vm.envOr("DEPLOYMENT_METADATA", string("../deployments/anvil.json"));
        string memory json = vm.readFile(metadataPath);
        address vault = vm.parseJsonAddress(json, ".contracts.convictionVault");
        address rewards = vm.parseJsonAddress(json, ".contracts.convictionRewards");
        address distributor = vm.parseJsonAddress(json, ".contracts.rewardDistributor");
        uint256 funding = vm.envOr("DEMO_FUNDING", CVR_TOTAL_SUPPLY);

        // 1. The Safe admin links the distributor. Skipped when already set
        //    (the call is one-time and reverts otherwise), so the script can
        //    be re-run after a partial failure.
        if (address(ConvictionVault(vault).rewardDistributor()) == address(0)) {
            uint256 safeAdminKey = vm.envUint("SAFE_ADMIN_KEY");
            vm.startBroadcast(safeAdminKey);
            ConvictionVault(vault).setRewardDistributor(distributor);
            vm.stopBroadcast();
        } else {
            console.log("Distributor already linked; skipping setRewardDistributor.");
        }

        // 2. The treasury approves and funds the distributor pool.
        uint256 treasuryKey = vm.envUint("TREASURY_KEY");
        vm.startBroadcast(treasuryKey);
        ConvictionRewards(rewards).approve(distributor, funding);
        RewardDistributor(distributor).fund(funding);
        vm.stopBroadcast();

        console.log("Reward distributor:", distributor);
        console.log("Reward pool funded with CVR:", funding);
    }
}

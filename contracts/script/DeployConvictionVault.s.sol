// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ConvictionRewards} from "../src/ConvictionRewards.sol";
import {ConvictionVault} from "../src/ConvictionVault.sol";

/// @notice Deploys the Conviction token and position contract bootstrap.
/// @dev Public deposits remain disabled until a RewardDistributor is deployed
///      and configured in the later reward-funding stage.
contract DeployConvictionVaultScript is Script {
    /// @notice Deploys CVR to the treasury and the CVP vault to Safe/guardian control.
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY");
        address safeAdmin = vm.envAddress("SAFE_ADMIN");
        address guardian = vm.envAddress("GUARDIAN");

        vm.startBroadcast(deployerPrivateKey);
        ConvictionRewards rewards = new ConvictionRewards(treasury);
        ConvictionVault vault = new ConvictionVault(safeAdmin, guardian);
        vm.stopBroadcast();

        console.log("Conviction Rewards (CVR):", address(rewards));
        console.log("Conviction Position / Vault:", address(vault));
        console.log("CVR treasury:", treasury);
        console.log("Vault Safe admin:", safeAdmin);
        console.log("Deposit guardian:", guardian);
        console.log("Deposits are disabled until a RewardDistributor is deployed and configured.");
    }
}

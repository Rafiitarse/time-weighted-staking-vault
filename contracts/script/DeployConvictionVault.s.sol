// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ConvictionRewards} from "../src/ConvictionRewards.sol";
import {ConvictionVault} from "../src/ConvictionVault.sol";
import {RewardDistributor} from "../src/RewardDistributor.sol";

/// @notice Deploys the Conviction token, position contract, and reward distributor.
/// @dev Public deposits remain disabled until the Safe admin calls setRewardDistributor
///      on ConvictionVault to link the deployed distributor.
contract DeployConvictionVaultScript is Script {
    /// @notice Deploys CVR, ConvictionVault, and RewardDistributor in the approved sequence.
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY");
        address safeAdmin = vm.envAddress("SAFE_ADMIN");
        address guardian = vm.envAddress("GUARDIAN");

        vm.startBroadcast(deployerPrivateKey);
        ConvictionRewards rewards = new ConvictionRewards(treasury);
        ConvictionVault vault = new ConvictionVault(safeAdmin, guardian);
        RewardDistributor distributor = new RewardDistributor(address(vault), address(rewards));
        vm.stopBroadcast();

        console.log("Conviction Rewards (CVR):", address(rewards));
        console.log("Conviction Position / Vault:", address(vault));
        console.log("Reward Distributor:", address(distributor));
        console.log("CVR treasury:", treasury);
        console.log("Vault Safe admin:", safeAdmin);
        console.log("Deposit guardian:", guardian);
        console.log("Next step: Safe admin must call vault.setRewardDistributor(distributor) to enable deposits.");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {StakingVault} from "../src/StakingVault.sol";
import {ReceiptToken} from "../src/ReceiptToken.sol";
import {RewardToken} from "../src/RewardToken.sol";

contract DeployVaultScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address safeAdmin = vm.envAddress("SAFE_ADMIN");

        console.log("-----------------------------------------");
        console.log("Deploying contracts with deployer:", deployer);
        console.log("Vault admin Safe:", safeAdmin);
        console.log("-----------------------------------------");

        vm.startBroadcast(deployerPrivateKey);

        StakingVault vault = new StakingVault(safeAdmin);

        ReceiptToken receiptToken = new ReceiptToken(address(vault));

        RewardToken rewardToken = new RewardToken(address(vault));

        vm.stopBroadcast();

        console.log("StakingVault deployed at  :", address(vault));
        console.log("ReceiptToken deployed at  :", address(receiptToken));
        console.log("RewardToken deployed at   :", address(rewardToken));
        console.log("Call setTokens(receipt, reward) from the Safe before accepting deposits.");
        console.log("-----------------------------------------");
    }
}
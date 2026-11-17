// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ConvictionRewards} from "../src/ConvictionRewards.sol";
import {ConvictionVault} from "../src/ConvictionVault.sol";
import {RewardDistributor} from "../src/RewardDistributor.sol";

/// @notice Deploys the Conviction token, position contract, and reward distributor.
/// @dev Public deposits remain disabled until the Safe admin calls setRewardDistributor
///      on ConvictionVault to link the deployed distributor.
/// @dev After broadcasting, the script emits deployment metadata to
///      $DEPLOYMENTS_DIR/$NETWORK_NAME.json (default: deployments/<network>.json)
///      so the frontend and subgraph read one canonical source of addresses.
contract DeployConvictionVaultScript is Script {
    /// @notice All inputs for the emitted deployment metadata file.
    struct MetadataInput {
        string deploymentsDir;
        string networkName;
        address treasury;
        address safeAdmin;
        address guardian;
        address rewards;
        address vault;
        address distributor;
        uint256 startBlock;
        uint256 deployedAtBlockTimestamp;
    }

    /// @notice Deploys CVR, ConvictionVault, and RewardDistributor in the approved sequence.
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY");
        address safeAdmin = vm.envAddress("SAFE_ADMIN");
        address guardian = vm.envAddress("GUARDIAN");

        (address rewards, address vault, address distributor) = _deploy(deployerPrivateKey, treasury, safeAdmin, guardian);
        _logSummary(rewards, vault, distributor, treasury, safeAdmin, guardian);

        _writeDeploymentMetadata(
            MetadataInput({
                deploymentsDir: vm.envOr("DEPLOYMENTS_DIR", string("deployments")),
                networkName: _resolveNetworkName(),
                treasury: treasury,
                safeAdmin: safeAdmin,
                guardian: guardian,
                rewards: rewards,
                vault: vault,
                distributor: distributor,
                // Below the true mined deploy block on block-time chains
                // because the script's head is read before broadcasting; a
                // lower bound is safe for indexing (extra empty blocks), a
                // higher one would miss early events. Exact on instant-mining
                // chains.
                startBlock: block.number - 1,
                deployedAtBlockTimestamp: block.timestamp
            })
        );
    }

    /// @notice Broadcasts the three deployments and returns their addresses.
    function _deploy(uint256 deployerPrivateKey, address treasury, address safeAdmin, address guardian)
        internal
        returns (address rewards, address vault, address distributor)
    {
        vm.startBroadcast(deployerPrivateKey);
        rewards = address(new ConvictionRewards(treasury));
        vault = address(new ConvictionVault(safeAdmin, guardian));
        distributor = address(new RewardDistributor(vault, rewards));
        vm.stopBroadcast();
    }

    /// @notice Keeps the original console output the deployment log always had.
    function _logSummary(
        address rewards,
        address vault,
        address distributor,
        address treasury,
        address safeAdmin,
        address guardian
    ) internal {
        console.log("Conviction Rewards (CVR):", rewards);
        console.log("Conviction Position / Vault:", vault);
        console.log("Reward Distributor:", distributor);
        console.log("CVR treasury:", treasury);
        console.log("Vault Safe admin:", safeAdmin);
        console.log("Deposit guardian:", guardian);
        console.log("Next step: Safe admin must call vault.setRewardDistributor(distributor) to enable deposits.");
    }

    /// @notice Maps the chain id to a deployment file name, with an env override.
    function _resolveNetworkName() internal view returns (string memory) {
        string memory overrideName = vm.envOr("NETWORK_NAME", string(""));
        if (bytes(overrideName).length > 0) return overrideName;

        if (block.chainid == 31337) return "anvil";
        if (block.chainid == 11155111) return "sepolia";
        revert("Unknown chain id: set NETWORK_NAME to name this network's deployment file");
    }

    /// @notice Builds the canonical deployment metadata as JSON and writes it to disk.
    function _writeDeploymentMetadata(MetadataInput memory m) internal {
        bool guardianIsSafe = m.guardian.code.length > 0;
        // Built with string concatenation because the forge-std JSON
        // serializer in this repo does not support embedding one serialized
        // object inside another (no 3-argument serializeJson overload).
        string memory json = string.concat(
            '{"network":"',
            m.networkName,
            '","chainId":',
            vm.toString(block.chainid),
            ',"contracts":{"convictionVault":"',
            vm.toString(m.vault),
            '","convictionRewards":"',
            vm.toString(m.rewards),
            '","rewardDistributor":"',
            vm.toString(m.distributor),
            '"},"treasury":"',
            vm.toString(m.treasury),
            '","safeAdmin":"',
            vm.toString(m.safeAdmin),
            '","guardian":"',
            vm.toString(m.guardian),
            '","guardianIsSafe":',
            guardianIsSafe ? "true" : "false",
            ',"startBlock":',
            vm.toString(m.startBlock),
            ',"depositsEnabled":false,',
            // Wall-clock time is not available on-chain; this is the block
            // timestamp of the head after deployment and is informational only.
            '"deployedAtBlockTimestamp":',
            vm.toString(m.deployedAtBlockTimestamp),
            '}'
        );

        vm.writeJson(json, string.concat(m.deploymentsDir, "/", m.networkName, ".json"));
    }
}

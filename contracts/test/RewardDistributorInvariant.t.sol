// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {ConvictionRewards} from "../src/ConvictionRewards.sol";
import {ConvictionVault} from "../src/ConvictionVault.sol";
import {RewardDistributor} from "../src/RewardDistributor.sol";

contract VaultHandler is Test {
    ConvictionVault public vault;
    ConvictionRewards public rewards;
    RewardDistributor public distributor;

    address public treasury;
    address[] public actors;
    uint256[] public activeTokenIds;

    uint256 public totalEthDeposited;
    uint256 public totalEthWithdrawn;
    uint256 public totalCvrFunded;
    uint256 public totalCvrPaid;

    constructor(
        ConvictionVault _vault,
        ConvictionRewards _rewards,
        RewardDistributor _distributor,
        address _treasury
    ) {
        vault = _vault;
        rewards = _rewards;
        distributor = _distributor;
        treasury = _treasury;

        actors.push(makeAddr("actor1"));
        actors.push(makeAddr("actor2"));
        actors.push(makeAddr("actor3"));

        for (uint256 i = 0; i < actors.length; i++) {
            vm.deal(actors[i], 1_000 ether);
        }
    }

    function deposit(uint8 actorIndex, uint96 amount) external {
        actorIndex = uint8(bound(actorIndex, 0, actors.length - 1));
        amount = uint96(bound(amount, 0.01 ether, 50 ether));

        address actor = actors[actorIndex];
        vm.prank(actor);
        uint256 tokenId = vault.deposit{value: amount}();

        activeTokenIds.push(tokenId);
        totalEthDeposited += amount;
    }

    function fund(uint96 amount) external {
        uint256 treasuryBalance = rewards.balanceOf(treasury);
        if (treasuryBalance == 0) return;

        amount = uint96(bound(amount, 1 ether, treasuryBalance));

        vm.startPrank(treasury);
        rewards.approve(address(distributor), amount);
        distributor.fund(amount);
        vm.stopPrank();

        totalCvrFunded += amount;
    }

    function warp(uint32 duration) external {
        duration = uint32(bound(duration, 1 days, 365 days));
        vm.warp(block.timestamp + duration);
    }

    function withdraw(uint256 tokenIndex, uint96 amount) external {
        if (activeTokenIds.length == 0) return;

        tokenIndex = bound(tokenIndex, 0, activeTokenIds.length - 1);
        uint256 tokenId = activeTokenIds[tokenIndex];

        address owner;
        try vault.ownerOf(tokenId) returns (address o) {
            owner = o;
        } catch {
            _removeToken(tokenIndex);
            return;
        }

        (uint128 remainingPrincipal,) = vault.positions(tokenId);
        if (remainingPrincipal == 0) {
            _removeToken(tokenIndex);
            return;
        }

        amount = uint96(bound(amount, 1 wei, remainingPrincipal));

        uint256 ownerCvrBefore = rewards.balanceOf(owner);

        vm.prank(owner);
        vault.withdraw(tokenId, amount, payable(owner));

        totalEthWithdrawn += amount;

        uint256 cvrReceived = rewards.balanceOf(owner) - ownerCvrBefore;
        totalCvrPaid += cvrReceived;

        (uint128 remainingAfter,) = vault.positions(tokenId);
        if (remainingAfter == 0) {
            _removeToken(tokenIndex);
        }
    }

    function transferPosition(uint256 tokenIndex, uint8 newOwnerIndex) external {
        if (activeTokenIds.length == 0) return;

        tokenIndex = bound(tokenIndex, 0, activeTokenIds.length - 1);
        newOwnerIndex = uint8(bound(newOwnerIndex, 0, actors.length - 1));

        uint256 tokenId = activeTokenIds[tokenIndex];
        address to = actors[newOwnerIndex];

        address owner;
        try vault.ownerOf(tokenId) returns (address o) {
            owner = o;
        } catch {
            _removeToken(tokenIndex);
            return;
        }

        if (owner == to) return;

        vm.prank(owner);
        vault.transferFrom(owner, to, tokenId);
    }

    function activeTokenCount() external view returns (uint256) {
        return activeTokenIds.length;
    }

    function _removeToken(uint256 index) private {
        activeTokenIds[index] = activeTokenIds[activeTokenIds.length - 1];
        activeTokenIds.pop();
    }
}

contract RewardDistributorInvariantTest is StdInvariant, Test {
    ConvictionVault private vault;
    ConvictionRewards private rewards;
    RewardDistributor private distributor;
    VaultHandler private handler;

    address private admin = makeAddr("admin");
    address private guardian = makeAddr("guardian");
    address private treasury = makeAddr("treasury");

    function setUp() public {
        rewards = new ConvictionRewards(treasury);
        vault = new ConvictionVault(admin, guardian);
        distributor = new RewardDistributor(address(vault), address(rewards));

        vm.prank(admin);
        vault.setRewardDistributor(address(distributor));

        handler = new VaultHandler(vault, rewards, distributor, treasury);

        targetContract(address(handler));
    }

    function invariant_CVR_TotalSupplyRemainsConstant() public view {
        assertEq(rewards.totalSupply(), 10_000_000 ether);
        assertEq(rewards.totalSupply(), rewards.SUPPLY_CAP());
    }

    function invariant_Vault_ETHConservation() public view {
        assertEq(
            address(vault).balance,
            handler.totalEthDeposited() - handler.totalEthWithdrawn(),
            "Vault ETH balance must exactly equal total deposits minus withdrawals"
        );
    }

    function invariant_Distributor_CVRConservation() public view {
        assertEq(
            rewards.balanceOf(address(distributor)),
            handler.totalCvrFunded() - handler.totalCvrPaid(),
            "Distributor balance must equal total funded minus total paid"
        );
    }

    function invariant_RewardsPaidNeverExceedTotalFunded() public view {
        assertLe(
            handler.totalCvrPaid(),
            handler.totalCvrFunded(),
            "Total rewards paid must never exceed total CVR funded"
        );
    }

    function invariant_TotalRewardsPaidNeverExceed15PercentOfWithdrawnPrincipal() public view {
        assertLe(
            handler.totalCvrPaid(),
            (handler.totalEthWithdrawn() * 150) / 1000 + 1 ether,
            "Total rewards paid must never exceed 15% maximum bonus"
        );
    }
}

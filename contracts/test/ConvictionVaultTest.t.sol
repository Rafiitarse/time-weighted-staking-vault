// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ConvictionRewards} from "../src/ConvictionRewards.sol";
import {ConvictionVault, IRewardDistributorConfig} from "../src/ConvictionVault.sol";

contract RewardDistributorConfigMock is IRewardDistributorConfig {
    address public immutable override vault;
    address public immutable override rewardToken;

    constructor(address configuredVault, address configuredRewardToken) {
        vault = configuredVault;
        rewardToken = configuredRewardToken;
    }
}

contract RejectingETHRecipient {
    receive() external payable {
        revert("ETH rejected");
    }
}

contract ReentrantPositionReceiver is IERC721Receiver {
    ConvictionVault private immutable vault;
    uint256 private immutable amount;
    bool public reentryFailed;

    constructor(ConvictionVault vault_, uint256 amount_) {
        vault = vault_;
        amount = amount_;
    }

    function deposit() external payable {
        vault.deposit{value: msg.value}();
    }

    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        (bool success,) = address(vault).call(abi.encodeCall(vault.withdraw, (tokenId, amount, payable(address(this)))));
        reentryFailed = !success;
        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable {}
}

contract ConvictionVaultTest is Test {
    ConvictionVault private vault;
    ConvictionRewards private rewards;
    address private admin = makeAddr("admin");
    address private guardian = makeAddr("guardian");
    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");
    address private operator = makeAddr("operator");

    function setUp() public {
        rewards = new ConvictionRewards(address(this));
        vault = new ConvictionVault(admin, guardian);
        vm.deal(alice, 20 ether);
        vm.deal(bob, 20 ether);
    }

    function _configureDistributor() private {
        RewardDistributorConfigMock distributor = new RewardDistributorConfigMock(address(vault), address(rewards));
        vm.prank(admin);
        vault.setRewardDistributor(address(distributor));
    }

    function test_CVP_MetadataAndCVRFixedSupply() public view {
        assertEq(vault.name(), "Conviction Position");
        assertEq(vault.symbol(), "CVP");
        assertEq(rewards.name(), "Conviction Rewards");
        assertEq(rewards.symbol(), "CVR");
        assertEq(rewards.decimals(), 18);
        assertEq(rewards.totalSupply(), 10_000_000 ether);
        assertEq(rewards.balanceOf(address(this)), 10_000_000 ether);
    }

    function test_CVR_RejectsZeroTreasury() public {
        vm.expectRevert(abi.encodeWithSelector(ConvictionRewards.InvalidTreasury.selector, address(0)));
        new ConvictionRewards(address(0));
    }

    function test_CVR_HasNoPostDeploymentMintAuthority() public {
        (bool success,) = address(rewards).call(abi.encodeWithSignature("mint(address,uint256)", alice, 1 ether));

        assertFalse(success);
        assertEq(rewards.totalSupply(), rewards.SUPPLY_CAP());
    }

    function test_DepositRequiresValidatedDistributorConfiguration() public {
        vm.prank(alice);
        vm.expectRevert(ConvictionVault.RewardDistributorNotSet.selector);
        vault.deposit{value: 1 ether}();

        RewardDistributorConfigMock wrongVault = new RewardDistributorConfigMock(address(0xBEEF), address(rewards));
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(ConvictionVault.RewardDistributorVaultMismatch.selector, address(0xBEEF))
        );
        vault.setRewardDistributor(address(wrongVault));

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ConvictionVault.InvalidRewardDistributor.selector, address(0xBEEF)));
        vault.setRewardDistributor(address(0xBEEF));

        _configureDistributor();
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 1 ether}();
        assertEq(vault.ownerOf(tokenId), alice);
    }

    function test_RewardDistributorCanOnlyBeConfiguredOnce() public {
        _configureDistributor();

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ConvictionVault.InvalidRewardDistributor.selector, address(0xBEEF)));
        vault.setRewardDistributor(address(0xBEEF));
    }

    function test_DepositCreatesUniqueCVPForEachLot() public {
        _configureDistributor();

        vm.startPrank(alice);
        uint256 firstId = vault.deposit{value: 2 ether}();
        uint256 secondId = vault.deposit{value: 3 ether}();
        vm.stopPrank();

        assertEq(firstId, 1);
        assertEq(secondId, 2);
        assertEq(vault.ownerOf(firstId), alice);
        assertEq(vault.ownerOf(secondId), alice);
        (uint128 firstAmount, uint64 firstTimestamp) = vault.positions(firstId);
        (uint128 secondAmount, uint64 secondTimestamp) = vault.positions(secondId);
        assertEq(firstAmount, 2 ether);
        assertEq(secondAmount, 3 ether);
        assertEq(firstTimestamp, secondTimestamp);
        assertEq(vault.nextTokenId(), 3);
    }

    function test_PositionTransferCarriesPrincipalAndAge() public {
        _configureDistributor();
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 4 ether}();
        vm.warp(block.timestamp + 183 days);
        uint64 originalTimestamp = _positionTimestamp(tokenId);

        vm.prank(alice);
        vault.safeTransferFrom(alice, bob, tokenId);

        assertEq(vault.ownerOf(tokenId), bob);
        assertEq(_positionAmount(tokenId), 4 ether);
        assertEq(_positionTimestamp(tokenId), originalTimestamp);
        (uint256 multiplier, uint256 quote) = vault.quoteReward(tokenId, 2 ether);
        assertEq(multiplier, 25);
        assertEq(quote, 0.05 ether);
    }

    function test_ApprovedOperatorCanTransferButCannotWithdraw() public {
        _configureDistributor();
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 2 ether}();

        vm.prank(alice);
        vault.approve(operator, tokenId);

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(ConvictionVault.NotPositionOwner.selector, operator, tokenId));
        vault.withdraw(tokenId, 1 ether, payable(operator));

        vm.prank(operator);
        vault.transferFrom(alice, bob, tokenId);
        assertEq(vault.ownerOf(tokenId), bob);
    }

    function test_OldOwnerCannotWithdrawAfterPositionTransfer() public {
        _configureDistributor();
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 2 ether}();
        vm.prank(alice);
        vault.transferFrom(alice, bob, tokenId);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ConvictionVault.NotPositionOwner.selector, alice, tokenId));
        vault.withdraw(tokenId, 1 ether, payable(alice));
    }

    function test_PositionCannotBeTransferredToVault() public {
        _configureDistributor();
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 1 ether}();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ConvictionVault.InvalidPositionRecipient.selector, address(vault)));
        vault.transferFrom(alice, address(vault), tokenId);
    }

    function test_PartialWithdrawalPreservesPositionAndTimestamp() public {
        _configureDistributor();
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 5 ether}();
        uint64 depositedAt = _positionTimestamp(tokenId);
        vm.warp(block.timestamp + 366 days);
        uint256 balanceBefore = bob.balance;

        vm.prank(alice);
        vault.withdraw(tokenId, 2 ether, payable(bob));

        assertEq(bob.balance, balanceBefore + 2 ether);
        assertEq(vault.ownerOf(tokenId), alice);
        assertEq(_positionAmount(tokenId), 3 ether);
        assertEq(_positionTimestamp(tokenId), depositedAt);
    }

    function test_FullWithdrawalBurnsCVPAndNeverReusesId() public {
        _configureDistributor();
        vm.startPrank(alice);
        uint256 firstId = vault.deposit{value: 1 ether}();
        vault.withdraw(firstId, 1 ether, payable(alice));
        uint256 secondId = vault.deposit{value: 1 ether}();
        vm.stopPrank();

        vm.expectRevert();
        vault.ownerOf(firstId);
        assertEq(vault.ownerOf(secondId), alice);
        assertEq(secondId, firstId + 1);
        (uint128 amount, uint64 timestamp) = vault.positions(firstId);
        assertEq(amount, 0);
        assertEq(timestamp, 0);
    }

    function test_WithdrawalRejectsInvalidAmountAndRecipient() public {
        _configureDistributor();
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 1 ether}();

        vm.startPrank(alice);
        vm.expectRevert(ConvictionVault.ZeroAmount.selector);
        vault.withdraw(tokenId, 0, payable(alice));

        vm.expectRevert(
            abi.encodeWithSelector(ConvictionVault.InsufficientPositionPrincipal.selector, 1 ether, 2 ether)
        );
        vault.withdraw(tokenId, 2 ether, payable(alice));

        vm.expectRevert(abi.encodeWithSelector(ConvictionVault.InvalidPositionRecipient.selector, address(0)));
        vault.withdraw(tokenId, 1 ether, payable(address(0)));

        vm.expectRevert(abi.encodeWithSelector(ConvictionVault.InvalidPositionRecipient.selector, address(vault)));
        vault.withdraw(tokenId, 1 ether, payable(address(vault)));
        vm.stopPrank();
    }

    function test_RejectingETHRecipientRevertsPositionEffects() public {
        _configureDistributor();
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 1 ether}();
        RejectingETHRecipient rejector = new RejectingETHRecipient();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ConvictionVault.TransferFailed.selector, address(rejector), 1 ether));
        vault.withdraw(tokenId, 1 ether, payable(address(rejector)));

        assertEq(vault.ownerOf(tokenId), alice);
        assertEq(_positionAmount(tokenId), 1 ether);
        assertEq(address(vault).balance, 1 ether);
    }

    function test_PauseStopsDepositsButAllowsTransfersAndWithdrawals() public {
        _configureDistributor();
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 1 ether}();

        vm.prank(guardian);
        vault.pauseDeposits();

        vm.prank(bob);
        vm.expectRevert();
        vault.deposit{value: 1 ether}();

        vm.prank(alice);
        vault.transferFrom(alice, bob, tokenId);
        vm.prank(bob);
        vault.withdraw(tokenId, 1 ether, payable(bob));

        assertEq(bob.balance, 21 ether);
        assertEq(vault.balanceOf(bob), 0);
    }

    function test_OnlyGuardianCanPauseAndOnlyAdminCanUnpause() public {
        _configureDistributor();

        vm.prank(admin);
        vm.expectRevert();
        vault.pauseDeposits();

        vm.prank(alice);
        vm.expectRevert();
        vault.pauseDeposits();

        vm.prank(guardian);
        vault.pauseDeposits();

        vm.prank(guardian);
        vm.expectRevert();
        vault.unpauseDeposits();

        vm.prank(admin);
        vault.unpauseDeposits();
        assertFalse(vault.paused());
    }

    function test_QuoteRewardUsesApprovedTierBoundariesAndRoundsDown() public {
        _configureDistributor();
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 2 ether}();
        uint256 depositedAt = block.timestamp;

        (uint256 multiplier, uint256 rewardAmount) = vault.quoteReward(tokenId, 2 ether);
        assertEq(multiplier, 0);
        assertEq(rewardAmount, 0);

        vm.warp(depositedAt + 183 days - 1);
        (multiplier,) = vault.quoteReward(tokenId, 2 ether);
        assertEq(multiplier, 0);

        uint256[6] memory thresholds = [uint256(183 days), 366 days, 549 days, 732 days, 915 days, 1098 days];
        uint256[6] memory expectedMultipliers = [uint256(25), 50, 75, 100, 125, 150];
        for (uint256 i; i < thresholds.length; ++i) {
            vm.warp(depositedAt + thresholds[i]);
            (multiplier, rewardAmount) = vault.quoteReward(tokenId, 2 ether);
            assertEq(multiplier, expectedMultipliers[i]);
            assertEq(rewardAmount, (2 ether * expectedMultipliers[i]) / 1000);
        }

        (, rewardAmount) = vault.quoteReward(tokenId, 1 wei);
        assertEq(rewardAmount, 0);
    }

    function test_DepositRejectsAmountAboveStorageLimit() public {
        _configureDistributor();
        uint256 amount = uint256(type(uint128).max) + 1;
        vm.deal(alice, amount);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ConvictionVault.AmountExceedsPositionLimit.selector, amount));
        vault.deposit{value: amount}();
    }

    function testFuzz_DepositAndPartialWithdrawalConservePrincipal(uint96 amount, uint96 withdrawal) public {
        vm.assume(amount > 0);
        vm.assume(withdrawal > 0 && withdrawal < amount);
        _configureDistributor();
        vm.deal(alice, amount);

        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: amount}();
        vm.prank(alice);
        vault.withdraw(tokenId, withdrawal, payable(alice));

        assertEq(_positionAmount(tokenId), uint256(amount) - withdrawal);
        assertEq(address(vault).balance, uint256(amount) - withdrawal);
        assertEq(vault.ownerOf(tokenId), alice);
    }

    function test_SafeMintCallbackCannotWithdrawReentrantly() public {
        _configureDistributor();
        ReentrantPositionReceiver receiver = new ReentrantPositionReceiver(vault, 1 ether);
        vm.deal(address(receiver), 1 ether);

        receiver.deposit{value: 1 ether}();

        assertTrue(receiver.reentryFailed());
        assertEq(vault.ownerOf(1), address(receiver));
        assertEq(_positionAmount(1), 1 ether);
        assertEq(address(vault).balance, 1 ether);
    }

    function _positionAmount(uint256 tokenId) private view returns (uint128 amount) {
        (amount,) = vault.positions(tokenId);
    }

    function _positionTimestamp(uint256 tokenId) private view returns (uint64 timestamp) {
        (, timestamp) = vault.positions(tokenId);
    }
}

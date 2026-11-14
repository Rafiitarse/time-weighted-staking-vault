// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ConvictionRewards} from "../src/ConvictionRewards.sol";
import {ConvictionVault} from "../src/ConvictionVault.sol";
import {RewardDistributor, IRewardDistributor} from "../src/RewardDistributor.sol";

contract RevertingDistributor is IRewardDistributor {
    address public immutable override vault;
    address public immutable override rewardToken;

    constructor(address vault_, address rewardToken_) {
        vault = vault_;
        rewardToken = rewardToken_;
    }

    function fund(uint256) external pure override {
        revert("fund failed");
    }

    function payoutReward(address, uint256) external pure override returns (bool) {
        revert("payout failed deliberately");
    }
}

contract RejectingETHRecipient {
    receive() external payable {
        revert("ETH transfer rejected");
    }
}

contract RewardDistributorTest is Test {
    ConvictionVault private vault;
    ConvictionRewards private rewards;
    RewardDistributor private distributor;

    address private admin = makeAddr("admin");
    address private guardian = makeAddr("guardian");
    address private treasury = makeAddr("treasury");
    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");
    address private carol = makeAddr("carol");

    event RewardFunded(address indexed funder, uint256 amount);
    event RewardPaid(address indexed recipient, uint256 amount);
    event Withdrawn(address indexed owner, address indexed recipient, uint256 indexed tokenId, uint256 amount);

    function setUp() public {
        rewards = new ConvictionRewards(treasury);
        vault = new ConvictionVault(admin, guardian);
        distributor = new RewardDistributor(address(vault), address(rewards));

        vm.prank(admin);
        vault.setRewardDistributor(address(distributor));

        vm.deal(alice, 50 ether);
        vm.deal(bob, 50 ether);
        vm.deal(carol, 50 ether);
    }

    /* -------------------------------------------------------------------------- */
    /*                         RewardDistributor Unit Tests                       */
    /* -------------------------------------------------------------------------- */

    function test_DistributorConstructor_RejectsZeroOrEOA() public {
        address eoa = makeAddr("eoa");

        vm.expectRevert(abi.encodeWithSelector(RewardDistributor.InvalidAddress.selector, address(0)));
        new RewardDistributor(address(0), address(rewards));

        vm.expectRevert(abi.encodeWithSelector(RewardDistributor.InvalidAddress.selector, eoa));
        new RewardDistributor(eoa, address(rewards));

        vm.expectRevert(abi.encodeWithSelector(RewardDistributor.InvalidAddress.selector, address(0)));
        new RewardDistributor(address(vault), address(0));

        vm.expectRevert(abi.encodeWithSelector(RewardDistributor.InvalidAddress.selector, eoa));
        new RewardDistributor(address(vault), eoa);
    }

    function test_Distributor_GettersAndImmutables() public view {
        assertEq(distributor.vault(), address(vault));
        assertEq(distributor.rewardToken(), address(rewards));
        assertEq(distributor.availableRewards(), 0);
    }

    function test_DistributorFund_RejectsZeroAmount() public {
        vm.prank(treasury);
        vm.expectRevert(RewardDistributor.ZeroAmount.selector);
        distributor.fund(0);
    }

    function test_DistributorFund_SuccessAndEmitsEvent() public {
        uint256 fundAmount = 100_000 ether;

        vm.startPrank(treasury);
        rewards.approve(address(distributor), fundAmount);

        vm.expectEmit(true, false, false, true, address(distributor));
        emit RewardFunded(treasury, fundAmount);
        distributor.fund(fundAmount);
        vm.stopPrank();

        assertEq(distributor.availableRewards(), fundAmount);
        assertEq(rewards.balanceOf(address(distributor)), fundAmount);
        assertEq(rewards.balanceOf(treasury), rewards.SUPPLY_CAP() - fundAmount);
    }

    function test_DistributorFund_PermissionlessFunding() public {
        uint256 fundAmount = 1_000 ether;

        vm.prank(treasury);
        rewards.transfer(bob, fundAmount);

        vm.startPrank(bob);
        rewards.approve(address(distributor), fundAmount);
        distributor.fund(fundAmount);
        vm.stopPrank();

        assertEq(distributor.availableRewards(), fundAmount);
        assertEq(rewards.balanceOf(bob), 0);
    }

    function test_PayoutReward_OnlyVaultCanCall() public {
        _fundDistributor(10_000 ether);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RewardDistributor.OnlyVault.selector, alice));
        distributor.payoutReward(alice, 10 ether);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(RewardDistributor.OnlyVault.selector, admin));
        distributor.payoutReward(alice, 10 ether);
    }

    function test_PayoutReward_RejectsZeroRecipient() public {
        vm.prank(address(vault));
        vm.expectRevert(abi.encodeWithSelector(RewardDistributor.InvalidAddress.selector, address(0)));
        distributor.payoutReward(address(0), 1 ether);
    }

    function test_PayoutReward_ZeroAmountReturnsTrueWithoutTransfer() public {
        vm.prank(address(vault));
        bool result = distributor.payoutReward(alice, 0);
        assertTrue(result);
        assertEq(rewards.balanceOf(alice), 0);
    }

    function test_PayoutReward_InsufficientBalanceReturnsFalse() public {
        _fundDistributor(5 ether);

        vm.prank(address(vault));
        bool result = distributor.payoutReward(alice, 10 ether);
        assertFalse(result);
        assertEq(rewards.balanceOf(alice), 0);
        assertEq(distributor.availableRewards(), 5 ether);
    }

    function test_PayoutReward_SuccessTransfersCVRAndEmitsEvent() public {
        _fundDistributor(100 ether);

        vm.prank(address(vault));
        vm.expectEmit(true, false, false, true, address(distributor));
        emit RewardPaid(alice, 10 ether);
        bool result = distributor.payoutReward(alice, 10 ether);

        assertTrue(result);
        assertEq(rewards.balanceOf(alice), 10 ether);
        assertEq(distributor.availableRewards(), 90 ether);
    }

    /* -------------------------------------------------------------------------- */
    /*                    ConvictionVault Reward Issuance Tests                   */
    /* -------------------------------------------------------------------------- */

    function test_Withdrawal_PaysRewardToOwner_NotETHRecipient() public {
        _fundDistributor(10_000 ether);

        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 10 ether}();

        vm.warp(block.timestamp + 366 days); // Tier 50/1000 = 5% -> 0.5 CVR

        uint256 bobEthBefore = bob.balance;
        uint256 aliceCvrBefore = rewards.balanceOf(alice);
        uint256 bobCvrBefore = rewards.balanceOf(bob);

        vm.prank(alice);
        vault.withdraw(tokenId, 10 ether, payable(bob));

        assertEq(bob.balance, bobEthBefore + 10 ether);
        assertEq(rewards.balanceOf(bob), bobCvrBefore);
        assertEq(rewards.balanceOf(alice), aliceCvrBefore + 0.5 ether);
    }

    function test_Withdrawal_Before183Days_NoRewardPaidOrSkipped() public {
        _fundDistributor(10_000 ether);

        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 10 ether}();

        vm.warp(block.timestamp + 100 days);

        vm.prank(alice);
        vault.withdraw(tokenId, 10 ether, payable(alice));

        assertEq(alice.balance, 50 ether);
        assertEq(rewards.balanceOf(alice), 0);
        assertEq(distributor.availableRewards(), 10_000 ether);
    }

    function test_Withdrawal_AllTierMultipliersPaidCorrectly() public {
        _fundDistributor(10_000 ether);

        uint256[6] memory daysThresholds = [uint256(183), 366, 549, 732, 915, 1098];
        uint256[6] memory expectedRewards = [
            uint256(0.025 ether), // 2.5% on 1 ETH
            0.05 ether,           // 5.0%
            0.075 ether,          // 7.5%
            0.10 ether,           // 10.0%
            0.125 ether,          // 12.5%
            0.15 ether            // 15.0%
        ];

        for (uint256 i = 0; i < daysThresholds.length; i++) {
            address user = makeAddr(string(abi.encodePacked("user", i)));
            vm.deal(user, 2 ether);

            vm.prank(user);
            uint256 tokenId = vault.deposit{value: 1 ether}();

            vm.warp(block.timestamp + daysThresholds[i] * 1 days);

            vm.prank(user);
            vault.withdraw(tokenId, 1 ether, payable(user));

            assertEq(rewards.balanceOf(user), expectedRewards[i]);
        }
    }

    function test_Withdrawal_ExactSecondsTierBoundary() public {
        _fundDistributor(10_000 ether);

        vm.prank(alice);
        uint256 firstToken = vault.deposit{value: 10 ether}();
        uint256 depositTimestamp = block.timestamp;

        // 1 second before 183 days -> 0%
        vm.warp(depositTimestamp + 183 days - 1);
        (uint256 mult0, uint256 quote0) = vault.quoteReward(firstToken, 10 ether);
        assertEq(mult0, 0);
        assertEq(quote0, 0);

        vm.prank(alice);
        vault.withdraw(firstToken, 10 ether, payable(alice));
        assertEq(rewards.balanceOf(alice), 0);

        // Exact 183 days -> 2.5%
        vm.prank(bob);
        uint256 secondToken = vault.deposit{value: 10 ether}();
        uint256 bobDepositTime = block.timestamp;

        vm.warp(bobDepositTime + 183 days);
        (uint256 mult1, uint256 quote1) = vault.quoteReward(secondToken, 10 ether);
        assertEq(mult1, 25);
        assertEq(quote1, 0.25 ether);

        vm.prank(bob);
        vault.withdraw(secondToken, 10 ether, payable(bob));
        assertEq(rewards.balanceOf(bob), 0.25 ether);
    }

    function test_Withdrawal_RoundingDown() public {
        _fundDistributor(10_000 ether);

        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 1 ether}();
        vm.warp(block.timestamp + 183 days); // 25 / 1000

        // 1 wei * 25 / 1000 = 0
        (uint256 mult, uint256 quote) = vault.quoteReward(tokenId, 1 wei);
        assertEq(mult, 25);
        assertEq(quote, 0);

        // 39 wei * 25 / 1000 = 0.975 -> 0
        (, quote) = vault.quoteReward(tokenId, 39 wei);
        assertEq(quote, 0);

        // 40 wei * 25 / 1000 = 1 wei
        (, quote) = vault.quoteReward(tokenId, 40 wei);
        assertEq(quote, 1 wei);
    }

    function test_Withdrawal_InsufficientRewardPool_SkipsRewardAndEmitsEvent() public {
        _fundDistributor(0.2 ether); // Less than the required 0.5 CVR

        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 10 ether}();

        vm.warp(block.timestamp + 366 days); // Quoted 0.5 CVR (5%)

        vm.expectEmit(true, true, false, true, address(vault));
        emit ConvictionVault.RewardSkipped(
            alice,
            tokenId,
            0.5 ether,
            ConvictionVault.RewardSkippedReason.INSUFFICIENT_POOL_BALANCE
        );

        vm.prank(alice);
        vault.withdraw(tokenId, 10 ether, payable(alice));

        assertEq(alice.balance, 50 ether); // Principal 10 ETH fully received
        assertEq(rewards.balanceOf(alice), 0); // No partial reward paid
        assertEq(distributor.availableRewards(), 0.2 ether); // Distributor balance untouched
        assertEq(vault.balanceOf(alice), 0); // Position burned on full withdrawal
    }

    function test_Withdrawal_DistributorRevert_SkipsRewardAndEmitsEvent() public {
        ConvictionVault customVault = new ConvictionVault(admin, guardian);
        RevertingDistributor revertingDistributor = new RevertingDistributor(address(customVault), address(rewards));

        vm.prank(admin);
        customVault.setRewardDistributor(address(revertingDistributor));

        vm.deal(alice, 10 ether);
        vm.prank(alice);
        uint256 tokenId = customVault.deposit{value: 5 ether}();

        vm.warp(block.timestamp + 366 days);

        vm.expectEmit(true, true, false, true, address(customVault));
        emit ConvictionVault.RewardSkipped(
            alice,
            tokenId,
            0.25 ether,
            ConvictionVault.RewardSkippedReason.DISTRIBUTOR_CALL_FAILED
        );

        vm.prank(alice);
        customVault.withdraw(tokenId, 5 ether, payable(alice));

        assertEq(alice.balance, 10 ether); // Principal withdrawal succeeded despite distributor revert
        assertEq(rewards.balanceOf(alice), 0);
    }

    function test_Withdrawal_FailedETHTransfer_RevertsEntireTransactionIncludingReward() public {
        _fundDistributor(10_000 ether);

        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 10 ether}();

        vm.warp(block.timestamp + 366 days);

        RejectingETHRecipient rejector = new RejectingETHRecipient();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ConvictionVault.TransferFailed.selector, address(rejector), 10 ether));
        vault.withdraw(tokenId, 10 ether, payable(address(rejector)));

        // Verify total rollback
        assertEq(vault.ownerOf(tokenId), alice);
        assertEq(rewards.balanceOf(alice), 0);
        assertEq(distributor.availableRewards(), 10_000 ether);
        assertEq(address(vault).balance, 10 ether);
    }

    function test_PositionTransfer_NewOwnerReceivesMaturityReward() public {
        _fundDistributor(10_000 ether);

        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 10 ether}();

        vm.warp(block.timestamp + 183 days);

        // Alice transfers CVP NFT to Bob
        vm.prank(alice);
        vault.transferFrom(alice, bob, tokenId);

        vm.warp(block.timestamp + 183 days); // Total age = 366 days -> 5%

        vm.prank(bob);
        vault.withdraw(tokenId, 10 ether, payable(bob));

        assertEq(rewards.balanceOf(alice), 0);
        assertEq(rewards.balanceOf(bob), 0.5 ether); // Bob received 5% on 10 ETH
        assertEq(bob.balance, 60 ether);
    }

    function test_RepeatedPartialWithdrawals_AccruesRewardsAccurately() public {
        _fundDistributor(10_000 ether);

        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 10 ether}();

        // 1st withdrawal: 2 ETH at 183 days (2.5%) -> 0.05 CVR
        vm.warp(block.timestamp + 183 days);
        vm.prank(alice);
        vault.withdraw(tokenId, 2 ether, payable(alice));
        assertEq(rewards.balanceOf(alice), 0.05 ether);

        // 2nd withdrawal: 3 ETH at 549 days total (7.5%) -> 0.225 CVR
        vm.warp(block.timestamp + 366 days);
        vm.prank(alice);
        vault.withdraw(tokenId, 3 ether, payable(alice));
        assertEq(rewards.balanceOf(alice), 0.05 ether + 0.225 ether);

        // 3rd withdrawal: 5 ETH at 1098 days total (15%) -> 0.75 CVR
        vm.warp(block.timestamp + 549 days);
        vm.prank(alice);
        vault.withdraw(tokenId, 5 ether, payable(alice));
        assertEq(rewards.balanceOf(alice), 0.05 ether + 0.225 ether + 0.75 ether);

        // Total ETH returned = 10 ETH, NFT burned
        assertEq(alice.balance, 50 ether);
        assertEq(vault.balanceOf(alice), 0);
    }

    function test_RepeatedPartialWithdrawals_MaxTotalRewardDoesNotExceed15Percent() public {
        _fundDistributor(10_000 ether);

        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 10 ether}();

        // Warp straight to max tier (> 1098 days)
        vm.warp(block.timestamp + 1200 days);

        // Withdraw in 10 parts of 1 ETH each
        for (uint256 i = 0; i < 10; i++) {
            vm.prank(alice);
            vault.withdraw(tokenId, 1 ether, payable(alice));
        }

        // 15% on 10 ETH = 1.5 CVR exactly
        assertEq(rewards.balanceOf(alice), 1.5 ether);
        assertEq(alice.balance, 50 ether);
    }

    function test_CVR_TotalSupplyRemainsCappedAt10Million() public {
        _fundDistributor(10_000_000 ether); // Fund full supply

        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: 20 ether}();
        vm.warp(block.timestamp + 1098 days);

        vm.prank(alice);
        vault.withdraw(tokenId, 20 ether, payable(alice));

        assertEq(rewards.totalSupply(), 10_000_000 ether);
        assertEq(rewards.totalSupply(), rewards.SUPPLY_CAP());
    }

    /* -------------------------------------------------------------------------- */
    /*                               Fuzz Tests                                   */
    /* -------------------------------------------------------------------------- */

    function testFuzz_RewardCalculationAndPayout(uint96 rawAmount, uint32 elapsedDays, uint96 rawWithdrawal) public {
        vm.assume(rawAmount >= 1_000_000); // Minimum sensible wei
        vm.assume(rawWithdrawal > 0 && rawWithdrawal <= rawAmount);
        vm.assume(elapsedDays <= 3650); // Up to 10 years

        uint256 depositAmount = uint256(rawAmount);
        uint256 withdrawAmount = uint256(rawWithdrawal);

        // Cap deposit so maximum 15% reward fits within 10,000,000 ether distributor pool
        vm.assume(depositAmount <= 60_000_000 ether);

        _fundDistributor(10_000_000 ether);

        vm.deal(alice, depositAmount);
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: depositAmount}();

        vm.warp(block.timestamp + uint256(elapsedDays) * 1 days);

        (uint256 quotedMultiplier, uint256 quotedReward) = vault.quoteReward(tokenId, withdrawAmount);

        uint256 aliceCvrBefore = rewards.balanceOf(alice);
        uint256 poolBefore = distributor.availableRewards();

        vm.prank(alice);
        vault.withdraw(tokenId, withdrawAmount, payable(alice));

        if (quotedReward > 0 && quotedReward <= poolBefore) {
            assertEq(rewards.balanceOf(alice), aliceCvrBefore + quotedReward);
            assertEq(distributor.availableRewards(), poolBefore - quotedReward);
        } else {
            assertEq(rewards.balanceOf(alice), aliceCvrBefore);
            assertEq(distributor.availableRewards(), poolBefore);
        }

        // Multiplier invariant: never exceeds 15% (150/1000)
        assertLe(quotedMultiplier, 150);
        // Reward invariant: never exceeds 15% of withdrawn amount
        assertLe(quotedReward, (withdrawAmount * 150) / 1000);
    }

    function testFuzz_RewardShortageDoesNotAffectPrincipal(uint96 rawDeposit, uint96 rawPool) public {
        vm.assume(rawDeposit >= 1 ether && rawDeposit <= 1000 ether);
        vm.assume(rawPool <= 10_000_000 ether);
        uint256 depositAmount = uint256(rawDeposit);
        uint256 poolAmount = uint256(rawPool);

        if (poolAmount > 0) {
            _fundDistributor(poolAmount);
        }

        vm.deal(alice, depositAmount);
        vm.prank(alice);
        uint256 tokenId = vault.deposit{value: depositAmount}();

        vm.warp(block.timestamp + 1098 days); // 15% reward
        (, uint256 quotedReward) = vault.quoteReward(tokenId, depositAmount);

        uint256 poolBefore = distributor.availableRewards();

        vm.prank(alice);
        vault.withdraw(tokenId, depositAmount, payable(alice));

        // Principal is ALWAYS fully returned
        assertEq(alice.balance, depositAmount);

        if (quotedReward > poolBefore) {
            // Shortage: zero reward paid, pool untouched
            assertEq(rewards.balanceOf(alice), 0);
            assertEq(distributor.availableRewards(), poolBefore);
        } else {
            // Full reward paid
            assertEq(rewards.balanceOf(alice), quotedReward);
            assertEq(distributor.availableRewards(), poolBefore - quotedReward);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Helpers                                  */
    /* -------------------------------------------------------------------------- */

    function _fundDistributor(uint256 amount) private {
        vm.startPrank(treasury);
        rewards.approve(address(distributor), amount);
        distributor.fund(amount);
        vm.stopPrank();
    }
}

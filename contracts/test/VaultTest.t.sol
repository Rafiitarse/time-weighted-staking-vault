// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Test.sol";
import "../src/StakingVault.sol"; 
import "../src/ReceiptToken.sol";
import "../src/RewardToken.sol";

contract ReentrancyAttacker {
    StakingVault public vault;
    bool private isAttacking;

    constructor(StakingVault _vault) {
        vault = _vault;
    }

    function attackDeposit() external payable {
        vault.deposit{value: msg.value}();
    }

    function attackWithdraw(uint256 lotId, uint256 amount) external {
        isAttacking = true;
        vault.withdrawFromLot(lotId, amount);
        isAttacking = false;
    }

    receive() external payable {
        if (isAttacking) {
            isAttacking = false;
            vault.withdrawFromLot(0, msg.value); 
        }
    }
}

contract ETHRejector {
    StakingVault public vault;

    constructor(StakingVault _vault) {
        vault = _vault;
    }

    function depositETH() external payable {
        vault.deposit{value: msg.value}();
    }

    function withdrawETH(uint256 lotId, uint256 amount) external {
        vault.withdrawFromLot(lotId, amount);
    }
}

contract StakingVaultMegaTest is Test {
    StakingVault vault;
    ReceiptToken receipt;
    RewardToken reward;

    address owner = address(this);
    address user1 = address(0x1);
    address user2 = address(0x2);

    function setUp() public {
        vault = new StakingVault();
        receipt = new ReceiptToken(address(vault));
        reward = new RewardToken(address(vault));
        vault.setTokens(address(receipt), address(reward));

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
    }

    function test_Tokens_ConstructorZeroAddress_Revert() public {
        vm.expectRevert("Invalid vault address");
        new ReceiptToken(address(0));

        vm.expectRevert("Invalid vault address");
        new RewardToken(address(0));
    }

    function test_Tokens_OnlyVaultAccess_Revert() public {
        vm.expectRevert(ReceiptToken.OnlyVaultAllowed.selector);
        receipt.mint(user1, 100);

        vm.expectRevert(ReceiptToken.OnlyVaultAllowed.selector);
        receipt.burn(user1, 100);

        vm.expectRevert(RewardToken.OnlyVaultAllowed.selector);
        reward.mint(user1, 100);
    }

    function test_Security_SBT_TransferBlocked() public {
        vm.startPrank(user1);
        vault.deposit{value: 10 ether}();
        vm.expectRevert(ReceiptToken.OnlyVaultAllowed.selector);
        receipt.transfer(user2, 5 ether);
        vm.stopPrank();
    }

    function test_Vault_SetTokens_AlreadySet_Revert() public {
        vm.expectRevert(StakingVault.TokensAlreadySet.selector);
        vault.setTokens(address(receipt), address(reward));
    }

    function test_Vault_Deposit_TokensNotSet_Revert() public {
        StakingVault freshVault = new StakingVault();
        vm.deal(user1, 1 ether);
        
        vm.prank(user1);
        vm.expectRevert(StakingVault.TokensNotSet.selector);
        freshVault.deposit{value: 1 ether}();
    }

    function test_Vault_OnlyOwnerAccess_Revert() public {
        vm.startPrank(user1);

        vm.expectRevert();
        vault.pause();

        vm.expectRevert();
        vault.unpause();

        vm.expectRevert();
        vault.setTokens(address(receipt), address(reward));

        vm.stopPrank();
    }

    function test_Vault_PausableLogic() public {
        vault.pause();
        
        vm.startPrank(user1);
        vm.expectRevert();
        vault.deposit{value: 1 ether}();
        vm.stopPrank();

        vault.unpause();
        
        vm.startPrank(user1);
        vault.deposit{value: 1 ether}();
        assertEq(receipt.balanceOf(user1), 1 ether);
        vm.stopPrank();
    }

    function test_Vault_Deposit_SuccessAndGetUserLots() public {
        vm.startPrank(user1);
        vault.deposit{value: 10 ether}();
        
        StakingVault.DepositLot[] memory lots = vault.getUserLots(user1);
        
        assertEq(lots.length, 1);
        assertEq(lots[0].amount, 10 ether);
        assertEq(lots[0].timestamp, block.timestamp);
        assertEq(receipt.balanceOf(user1), 10 ether);
        vm.stopPrank();
    }

    function test_Vault_Deposit_ZeroAmount_Revert() public {
        vm.prank(user1);
        vm.expectRevert(StakingVault.ZeroAmount.selector);
        vault.deposit{value: 0}();
    }

    function test_Vault_Withdraw_ZeroAmount_Revert() public {
        vm.prank(user1);
        vm.expectRevert(StakingVault.ZeroAmount.selector);
        vault.withdrawFromLot(0, 0);
    }

    function test_Vault_Withdraw_InvalidLotId_Revert() public {
        vm.startPrank(user1);
        vault.deposit{value: 10 ether}();
        
        vm.expectRevert(StakingVault.InvalidLotId.selector);
        vault.withdrawFromLot(99, 10 ether);
        vm.stopPrank();
    }

    function test_Vault_Withdraw_InsufficientLotAmount_Revert() public {
        vm.startPrank(user1);
        vault.deposit{value: 5 ether}();

        vm.expectRevert(StakingVault.InsufficientLotAmount.selector);
        vault.withdrawFromLot(0, 10 ether);
        vm.stopPrank();
    }

    function test_Vault_Withdraw_InsufficientReceiptBalance_Revert() public {
        vm.startPrank(user1);
        vault.deposit{value: 10 ether}();

        vm.mockCall(
            address(receipt),
            abi.encodeWithSelector(IERC20.balanceOf.selector, user1),
            abi.encode(0)
        );

        vm.expectRevert(StakingVault.InsufficientReceiptBalance.selector);
        vault.withdrawFromLot(0, 10 ether);
        vm.stopPrank();
    }

    function test_Security_ReentrancyGuard() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(vault);
        vm.deal(address(attacker), 1 ether);

        attacker.attackDeposit{value: 1 ether}();
        
        vm.expectRevert();
        attacker.attackWithdraw(0, 1 ether);
    }

    function test_Vault_Withdraw_TransferFailed_Revert() public {
        ETHRejector rejector = new ETHRejector(vault);
        vm.deal(address(rejector), 10 ether);

        rejector.depositETH{value: 5 ether}();

        vm.expectRevert(StakingVault.TransferFailed.selector);
        rejector.withdrawETH(0, 5 ether);
    }

    function test_Vault_CalculateLotMultiplier_AllTiers() public {
        vm.startPrank(user1);
        vault.deposit{value: 70 ether}(); 

        vault.withdrawFromLot(0, 10 ether);
        assertEq(reward.balanceOf(user1), 0);

        vm.warp(block.timestamp + 183 days);
        vault.withdrawFromLot(0, 10 ether);
        assertEq(reward.balanceOf(user1), 1.5 ether);

        vm.warp(block.timestamp + 183 days);
        vault.withdrawFromLot(0, 10 ether);
        assertEq(reward.balanceOf(user1), 3.5 ether);

        vm.warp(block.timestamp + 183 days);
        vault.withdrawFromLot(0, 10 ether);
        assertEq(reward.balanceOf(user1), 6.0 ether);

        vm.warp(block.timestamp + 183 days);
        vault.withdrawFromLot(0, 10 ether);
        assertEq(reward.balanceOf(user1), 9.0 ether);

        vm.warp(block.timestamp + 183 days);
        vault.withdrawFromLot(0, 10 ether);
        assertEq(reward.balanceOf(user1), 12.5 ether);

        vm.warp(block.timestamp + 183 days);
        vault.withdrawFromLot(0, 10 ether);
        assertEq(reward.balanceOf(user1), 16.5 ether);

        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. BEHAVIOR: partial withdrawal must NOT reset the lot's original timestamp
    //    This is the core selling point of the whole protocol (README explicitly
    //    promises it) but nothing in the current suite verifies it.
    // ─────────────────────────────────────────────────────────────────────────
    function test_Behavior_PartialWithdraw_PreservesTimestamp() public {
        vm.startPrank(user1);
        vault.deposit{value: 10 ether}();

        StakingVault.DepositLot[] memory lotsBefore = vault.getUserLots(user1);
        uint64 originalTimestamp = lotsBefore[0].timestamp;

        // Move forward, then withdraw only part of the lot.
        vm.warp(block.timestamp + 100 days);
        vault.withdrawFromLot(0, 4 ether);

        StakingVault.DepositLot[] memory lotsAfter = vault.getUserLots(user1);
        assertEq(
            lotsAfter[0].timestamp,
            originalTimestamp,
            "partial withdrawal must not reset the lot's maturity timestamp"
        );
        assertEq(lotsAfter[0].amount, 6 ether, "remaining amount should decrease by the withdrawn portion");

        // A second partial withdrawal, further in the future, must still use the
        // ORIGINAL timestamp for its multiplier -- not the time of this withdrawal.
        vm.warp(block.timestamp + 100 days); // lot is now 200 days old in total
        vault.withdrawFromLot(0, 6 ether);
        assertEq(reward.balanceOf(user1), 0.9 ether, "second withdrawal should use the lot's original age, not a reset one");
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. BOUNDARY: every tier threshold, tested one second below and exactly at.
    //    The existing all-tiers test jumps in 183-day increments and would never
    //    catch an off-by-one in `_calculateLotMultiplier` (e.g. `>` vs `>=`).
    // ─────────────────────────────────────────────────────────────────────────
    function _assertMultiplierAtAge(uint256 ageInSeconds, uint256 expectedMultiplierBP) internal {
        // Fresh probe address per check so each boundary is fully isolated.
        address probe = address(uint160(uint256(keccak256(abi.encodePacked(ageInSeconds, expectedMultiplierBP)))));
        vm.deal(probe, 10 ether);

        vm.startPrank(probe);
        vault.deposit{value: 10 ether}();
        vm.warp(block.timestamp + ageInSeconds);
        vault.withdrawFromLot(0, 10 ether);

        uint256 expectedReward = (10 ether * expectedMultiplierBP) / 1000;
        assertEq(reward.balanceOf(probe), expectedReward, "unexpected reward at this age boundary");
        vm.stopPrank();
    }

    function test_Boundary_AllTierThresholds() public {
        _assertMultiplierAtAge(183 days - 1, 0);    // one second before 6mo -> still 0%
        _assertMultiplierAtAge(183 days,     150);  // exactly 6mo -> 15%
        _assertMultiplierAtAge(366 days - 1, 150);  // one second before 1yr -> still 15%
        _assertMultiplierAtAge(366 days,     200);  // exactly 1yr -> 20%
        _assertMultiplierAtAge(549 days - 1, 200);
        _assertMultiplierAtAge(549 days,     250);
        _assertMultiplierAtAge(732 days - 1, 250);
        _assertMultiplierAtAge(732 days,     300);
        _assertMultiplierAtAge(915 days - 1, 300);
        _assertMultiplierAtAge(915 days,     350);
        _assertMultiplierAtAge(1098 days - 1, 350);
        _assertMultiplierAtAge(1098 days,     400); // exactly 3yr -> max 40%
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. FUZZ: deposit accounting holds for any (realistic) amount.
    //    Bounded to uint96 -- far beyond total ETH supply, but keeps `vm.deal`
    //    fast and avoids the (practically unreachable) uint128 truncation edge
    //    in `deposit()`, which is worth knowing about even if not fuzzed here:
    //    `uint128(msg.value)` silently truncates rather than reverting if
    //    msg.value > type(uint128).max. Not exploitable given ETH's total
    //    supply, but an auditor will ask if you know about it -- now you do.
    // ─────────────────────────────────────────────────────────────────────────
    function testFuzz_Deposit_LotRecordsExactAmount(uint96 amount) public {
        vm.assume(amount > 0);
        vm.deal(user1, amount);

        vm.startPrank(user1);
        vault.deposit{value: amount}();

        StakingVault.DepositLot[] memory lots = vault.getUserLots(user1);
        assertEq(lots.length, 1);
        assertEq(lots[0].amount, amount, "stored lot amount must exactly match msg.value");
        assertEq(receipt.balanceOf(user1), amount, "receipt tokens must be minted 1:1");
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FUZZ: withdrawal accounting -- covers the zero-amount revert, the
    //    over-withdraw revert, and the success path, all from one fuzzed pair.
    // ─────────────────────────────────────────────────────────────────────────
    function testFuzz_WithdrawFromLot_ConservesAccounting(uint96 depositAmount, uint96 withdrawAmount) public {
        vm.assume(depositAmount > 0);
        vm.deal(user1, depositAmount);

        vm.startPrank(user1);
        vault.deposit{value: depositAmount}();

        if (withdrawAmount == 0) {
            vm.expectRevert(StakingVault.ZeroAmount.selector);
            vault.withdrawFromLot(0, withdrawAmount);
        } else if (withdrawAmount > depositAmount) {
            vm.expectRevert(StakingVault.InsufficientLotAmount.selector);
            vault.withdrawFromLot(0, withdrawAmount);
        } else {
            uint256 ethBefore = user1.balance;
            uint256 receiptBefore = receipt.balanceOf(user1);

            vault.withdrawFromLot(0, withdrawAmount);

            assertEq(user1.balance, ethBefore + withdrawAmount, "ETH payout must equal the withdrawn amount");
            assertEq(receipt.balanceOf(user1), receiptBefore - withdrawAmount, "receipt tokens must burn 1:1");

            StakingVault.DepositLot[] memory lots = vault.getUserLots(user1);
            assertEq(lots[0].amount, depositAmount - withdrawAmount, "remaining lot amount must be exact");
        }
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. MULTI-LOT: withdrawing from one lot must never affect a sibling lot.
    //    Every existing test only ever touches a single lot per user.
    // ─────────────────────────────────────────────────────────────────────────
    function test_MultiLot_WithdrawalsAreIsolated() public {
        vm.startPrank(user1);
        vault.deposit{value: 5 ether}();  // lot 0
        vm.warp(block.timestamp + 200 days);
        vault.deposit{value: 3 ether}();  // lot 1, younger, different multiplier tier

        // Withdraw fully from lot 1 (young, 0% reward) -- lot 0 must be untouched.
        vault.withdrawFromLot(1, 3 ether);

        StakingVault.DepositLot[] memory lots = vault.getUserLots(user1);
        assertEq(lots[0].amount, 5 ether, "lot 0 amount must be unaffected by lot 1 withdrawal");
        assertEq(lots[1].amount, 0, "lot 1 should be fully withdrawn");
        assertEq(reward.balanceOf(user1), 0, "lot 1 was too young to earn any reward");
        vm.stopPrank();
    }


}
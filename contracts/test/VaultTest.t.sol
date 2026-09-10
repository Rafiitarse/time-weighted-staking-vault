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
}
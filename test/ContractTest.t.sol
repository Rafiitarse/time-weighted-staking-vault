// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../src/StakingVault.sol";
import "../src/ReceiptToken.sol";
import "../src/RewardToken.sol";

contract ContractTest is Test {

    StakingVault public vault;
    ReceiptToken public receiptToken; 
    RewardToken public rewardToken; 

    address public owner = makeAddr("owner");
    address public ray = makeAddr("ray");
    address public gary = makeAddr("gary");

    function setUp () public {
        vm.startPrank(owner);

        vault = new StakingVault();
        receiptToken = new ReceiptToken(address (vault));
        rewardToken  = new RewardToken(address(vault));
        
        vault.setTokens(address(receiptToken), address(rewardToken));

        vm.stopPrank();

        vm.deal(ray, 200 ether);
        vm.deal(gary, 200 ether);
    }

    function test_InitialTest() public view {
        assertEq(address(receiptToken.vault()), address(vault));
        assertEq(address(rewardToken.vault()), address(vault));
        assertEq(address(vault.receiptToken()), address(receiptToken));
        assertEq(address(vault.rewardToken()), address(rewardToken));
    }

    function test_PauseAndUnpause() public {
        vm.prank(owner);
        vault.pause();
        vm.prank(owner);
        vault.unpause();
    }

    function test_Deposit_FirstTime_Success() public {
        uint256 depositAmount = 1 ether;
        
        // Simulasikan waktu saat deposit
        vm.warp(1000); 

        vm.prank(ray);
        vault.deposit{value: depositAmount}();

        // Check 1: State Balance
        assertEq(vault.userBalance(ray), depositAmount, "User balance di Vault harus 1 ETH");
        assertEq(address(vault).balance, depositAmount, "Balance ETH Vault harus 1 ETH");

        // Check 2: Deposit Time dicatat sesuai block.timestamp
        assertEq(vault.depositTime(ray), 1000, "Deposit time harus diset ke timestamp saat ini");

        // Check 3: Receipt Token ter-mint ke Alice
        assertEq(receiptToken.balanceOf(ray), depositAmount, "Alice harus dapet 1 ReceiptToken");
    }

    // 2. LOGIKA MATEMATIKA: Deposit Kedua (Weighted Average Time)
    function test_Deposit_SecondTime_WeightedTimeCalculation() public {
        // Step A: Deposit Pertama 1 ETH di detik ke-1000
        vm.warp(1000);
        vm.prank(gary);
        vault.deposit{value: 1 ether}();

        // Step B: Waktu berjalan 100 detik (sekarang detik ke-1100)
        vm.warp(1100);

        // Step C: Deposit Kedua 1 ETH di detik ke-1100
        // Rumus di contract lu:
        // oldBalance = 1 ETH, newBalance = 2 ETH
        // (block.timestamp - depositTime) = 1100 - 1000 = 100
        // (100 * 1 ETH) / 2 ETH = 50
        // depositTime baru = 1100 - 50 = 1050
        vm.prank(gary);
        vault.deposit{value: 1 ether}();

        // Check 1: Total balance Alice jadi 2 ETH
        assertEq(vault.userBalance(gary), 2 ether);

        // Check 2: depositTime disesuaikan jadi 1050
        assertEq(vault.depositTime(gary), 1050, "Weighted deposit time tidak sesuai matematika!");

        // Check 3: Receipt token Alice nambah jadi 2 ETH
        assertEq(receiptToken.balanceOf(gary), 2 ether);
    }

    // 3. REVERT: Deposit 0 ETH
    function test_RevertWhen_DepositAmountIsZero() public {
        vm.prank(ray);
        
        vm.expectRevert("Deposit amount must be greater than zero");
        vault.deposit{value: 0}();
    }

    // 4. REVERT: Deposit Saat Contract Paused
    function test_RevertWhen_DepositWhilePaused() public {
        // Owner me-pause vault
        vm.prank(owner);
        vault.pause(); // Asumsi vault punya fungsi pause()

        vm.prank(ray);
        // Expect error EnforcedPause() dari OpenZeppelin
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.deposit{value: 1 ether}();
    }

    // 5. EVENT: Memastikan Event Deposited Ter-emit
    function test_Emit_DepositedEvent() public {
        // Check topic 1 (indexed user) dan data (amount)
        vm.expectEmit(true, false, false, true);
        emit StakingVault.Deposited(gary, 1 ether);

        vm.prank(gary);
        vault.deposit{value: 1 ether}();
    }

}

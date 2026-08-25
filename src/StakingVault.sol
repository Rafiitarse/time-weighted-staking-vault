// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ITokenMintable {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract StakingVault is ReentrancyGuard, Pausable, Ownable {
    ITokenMintable public receiptToken;
    ITokenMintable public rewardToken;

    struct DepositLot {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => DepositLot[]) public userLots;

    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 rewardAmount);
    event TokensSet(address indexed receiptToken, address indexed rewardToken);

    error ZeroAmount();
    error InsufficientReceiptBalance();
    error TransferFailed();
    error TokensAlreadySet();

    constructor() Ownable(msg.sender) {}

    function setTokens(address _receiptToken, address _rewardToken) external onlyOwner {
        require(address(receiptToken) == address(0), "Tokens already set");
        receiptToken = ITokenMintable(_receiptToken);
        rewardToken = ITokenMintable(_rewardToken);
        emit TokensSet(_receiptToken, _rewardToken);
    }

    function pause() external onlyOwner{
        _pause();
    }

    function unpause() external onlyOwner{
        _unpause();
    }

    function deposit() external payable whenNotPaused nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        userLots[msg.sender].push(DepositLot({
            amount: msg.value,
            timestamp: block.timestamp
        }));

        receiptToken.mint(msg.sender, msg.value);

        emit Deposited(msg.sender, msg.value, block.timestamp);
    }

    function _calculateLotMultiplier(uint256 depositTimestamp) internal view returns (uint256) {
        uint256 age = block.timestamp - depositTimestamp;

        if (age >= 183 days) {
            return 150; // 2x Multiplier
        } else if (age >= 366 days) {
            return 200;
        } else if (age >= 549 days) {
            return 250;
        } else if (age >= 732 days) {
            return 300;
        } else if (age >= 915 days) {
            return 350;
        } else if (age >= 1098 days) {
            return 400;
        } else {
            return 0;
        }
    }

    function withdraw(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (receiptToken.balanceOf(msg.sender) < amount) revert InsufficientReceiptBalance();

        uint256 remainingToWithdraw = amount;
        uint256 totalReward = 0;

        DepositLot[] storage lots = userLots[msg.sender];

        for (uint256 i = 0; i < lots.length && remainingToWithdraw > 0; i++) {
            DepositLot storage currentLot = lots[i];

            if (currentLot.amount == 0) continue;

            uint256 takeAmount = remainingToWithdraw < currentLot.amount 
                ? remainingToWithdraw 
                : currentLot.amount;

            uint256 multiplier = _calculateLotMultiplier(currentLot.timestamp);
            
            if (multiplier > 0) {
                uint256 baseReward = takeAmount / 10; // 10% base
                totalReward += (baseReward * multiplier) / 100;
            }

            currentLot.amount -= takeAmount;
            remainingToWithdraw -= takeAmount;
        }

        receiptToken.burn(msg.sender, amount);
        
        if(totalReward > 0){
            rewardToken.mint(msg.sender, totalReward);
        }

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawn(msg.sender, amount, totalReward);
        }
    }
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
        uint128 amount;     
        uint64 timestamp;   
    }

    mapping(address => DepositLot[]) public userLots;

    event Deposited(address indexed user, uint256 lotId, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 lotId, uint256 amount, uint256 rewardAmount);
    event TokensSet(address indexed receiptToken, address indexed rewardToken);

    error ZeroAmount();
    error InsufficientReceiptBalance();
    error TransferFailed();
    error InvalidLotId();
    error InsufficientLotAmount();
    error TokensNotSet();
    error TokensAlreadySet();

    constructor() Ownable(msg.sender) {}

    function setTokens(address _receiptToken, address _rewardToken) external onlyOwner {
        if (address(receiptToken) != address(0)) revert TokensAlreadySet();
        receiptToken = ITokenMintable(_receiptToken);
        rewardToken = ITokenMintable(_rewardToken);
        emit TokensSet(_receiptToken, _rewardToken);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function deposit() external payable whenNotPaused nonReentrant {
        if (address(receiptToken) == address(0)) revert TokensNotSet();
        if (msg.value == 0) revert ZeroAmount();

        uint256 newLotId = userLots[msg.sender].length;

        userLots[msg.sender].push(DepositLot({
            amount: uint128(msg.value),
            timestamp: uint64(block.timestamp)
        }));

        receiptToken.mint(msg.sender, msg.value);

        emit Deposited(msg.sender, newLotId, msg.value, block.timestamp);
    }

    function _calculateLotMultiplier(uint256 depositTimestamp) internal view returns (uint256) {
        uint256 age = block.timestamp - depositTimestamp;

        if (age >= 1098 days) return 400;
        if (age >= 915 days) return 350;
        if (age >= 732 days) return 300;
        if (age >= 549 days) return 250;
        if (age >= 366 days) return 200;
        if (age >= 183 days) return 150;
        return 0;
    }

    function withdrawFromLot(uint256 lotId, uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (lotId >= userLots[msg.sender].length) revert InvalidLotId();
        
        DepositLot storage currentLot = userLots[msg.sender][lotId];
        
        if (currentLot.amount < amount) revert InsufficientLotAmount();
        if (receiptToken.balanceOf(msg.sender) < amount) revert InsufficientReceiptBalance();

        uint256 multiplier = _calculateLotMultiplier(currentLot.timestamp);
        uint256 totalReward = 0;

        if (multiplier > 0) {
            totalReward = (amount * multiplier) / 1000; 
        }

        currentLot.amount -= uint128(amount);

        receiptToken.burn(msg.sender, amount);
        
        if (totalReward > 0) {
            rewardToken.mint(msg.sender, totalReward);
        }

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawn(msg.sender, lotId, amount, totalReward);
    }

    function getUserLots(address user) external view returns (DepositLot[] memory) {
        return userLots[user];
    }
}
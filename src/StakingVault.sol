// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ITokenMintable {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

contract StakingVault is ReentrancyGuard, Pausable, Ownable {
    ITokenMintable public receiptToken;
    ITokenMintable public rewardToken;

    mapping(address => uint256) public depositTime;
    mapping(address => uint256) public userBalance;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 rewardAmount);

    constructor() Ownable(msg.sender) {}

    function setTokens(address _receiptToken, address _rewardToken) external {
        require(_receiptToken != address(0), "Token already set");
        receiptToken = ITokenMintable(_receiptToken);
        rewardToken = ITokenMintable(_rewardToken);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function deposit() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Deposit amount must be greater than zero");

        if (userBalance[msg.sender] == 0) {
            depositTime[msg.sender] = block.timestamp;
        } else {
            uint256 oldBalance = userBalance[msg.sender];
            uint256 newBalance = oldBalance + msg.value;
            depositTime[msg.sender] = block.timestamp - (
                ((block.timestamp - depositTime[msg.sender]) * oldBalance) / newBalance
            );
        }
        userBalance[msg.sender] += msg.value;

        receiptToken.mint(msg.sender, msg.value);

        emit Deposited(msg.sender, msg.value);
    }

    function getMultiplier(address user) public view returns (uint256) {
        if (userBalance[user] == 0) return 100;

        uint256 duration = block.timestamp - depositTime[user];

        if (duration >= 90 days) {
            return 200;
        } else if (duration >= 30 days) {
            return 150;
        } else {
            return 100;
        }
    }

    function withdraw(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Withdraw amount must be greater than zero");
        require(userBalance[msg.sender] >= amount, "Insufficient balance");

        receiptToken.burn(msg.sender, amount);

        uint256 baseReward = amount / 10;
        uint256 multiplier = getMultiplier(msg.sender);

        uint256 finalReward = (baseReward * multiplier) / 100;

        userBalance[msg.sender] -= amount;

        if (userBalance[msg.sender] == 0) {
            depositTime[msg.sender] = 0;
        }

        rewardToken.mint(msg.sender, finalReward);

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount, finalReward);
    }

}
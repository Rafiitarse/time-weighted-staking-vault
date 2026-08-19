// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RewardToken is ERC20 {
    address public immutable vault;

    error OnlyVaultAllowed();

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVaultAllowed();
        _;
    }

    constructor(address _vault) ERC20("Reward Token", "RWD") {
        vault =  _vault;
    }

    function mint(address to, uint256 amount) external onlyVault {
        _mint(to, amount);
    }
}
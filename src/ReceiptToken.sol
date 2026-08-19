// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contract/token/ERC20/ERC20.sol";

contract ReceiptToken is ERC 20 {
    address public immutable vault;

    error OnlyVaultAllowed();

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVaultAllowed();
        _;
    }

    constructor(address _vault) ERC20("Staked ETH Receipt", "stETH") {
        vault = _vault;
    }

    function mint(address to, uint256 amount) external onlyVault {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyVault {
        _burn(from, amount);
    }
}
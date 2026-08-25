// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ReceiptToken is ERC20 {
    address public immutable vault;

    error OnlyVaultAllowed();

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVaultAllowed();
        _;
    }

    constructor(address _vault) ERC20("Staked ETH Receipt", "stETH") {
        require(_vault != address(0), "Invalid vault address");
        vault = _vault;
    }

    function mint(address to, uint256 amount) external onlyVault {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyVault {
        _burn(from, amount);
    }
    
    function _update(address from, address to, uint256 value) internal override {
    if (from != address(0) && to != address(0)) {
        if (msg.sender != vault) {
            revert OnlyVaultAllowed(); // Blokir transfer antar user biasa!
        }
    }
    super._update(from, to, value);
}
}
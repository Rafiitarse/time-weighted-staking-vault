// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Staked ETH Receipt Token
/// @author Lintar Ar' Rafii
/// @notice ERC-20 receipt token representing ETH deposited into the staking vault.
/// @dev Tokens can only be minted or burned by the configured vault. Regular
///      users are prevented from transferring receipt tokens directly to other
///      users. This preserves the relationship between a receipt token balance
///      and the corresponding user's staking position in the vault.
contract ReceiptToken is ERC20 {

    /// @notice The staking vault authorized to mint, burn, and perform
    ///         receipt token transfers.
    /// @dev This address is immutable and is set during contract deployment.
    address public immutable vault;

    /// @notice Thrown when an account other than the vault attempts
    ///         to perform a vault-restricted operation.
    error OnlyVaultAllowed();

    /// @notice Restricts execution to the configured staking vault.
    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVaultAllowed();
        _;
    }

    /// @notice Creates the receipt token and assigns the staking vault as
    ///         the token's authorized controller.
    /// @param _vault The address of the staking vault contract.
    constructor(address _vault)
        ERC20("Staked ETH Receipt", "stETH")
    {
        require(
            _vault != address(0),
            "Invalid vault address"
        );

        vault = _vault;
    }

    /// @notice Mints receipt tokens to an address.
    /// @dev Only the configured vault can mint receipt tokens.
    /// @param to The address that will receive the minted receipt tokens.
    /// @param amount The amount of receipt tokens to mint.
    function mint(
        address to,
        uint256 amount
    ) external onlyVault {
        _mint(to, amount);
    }

    /// @notice Burns receipt tokens from an address.
    /// @dev Only the configured vault can burn receipt tokens.
    /// @param from The address whose receipt tokens will be burned.
    /// @param amount The amount of receipt tokens to burn.
    function burn(
        address from,
        uint256 amount
    ) external onlyVault {
        _burn(from, amount);
    }

    /// @notice Updates receipt token balances.
    /// @dev Direct transfers between non-zero addresses are restricted to the
    ///      configured vault. Minting and burning remain permitted because
    ///      they involve the zero address.
    /// @param from The address whose balance is decreased, or the zero address
    ///             when tokens are minted.
    /// @param to The address whose balance is increased, or the zero address
    ///           when tokens are burned.
    /// @param value The amount of receipt tokens being transferred, minted,
    ///              or burned.
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        if (from != address(0) && to != address(0)) {
            if (msg.sender != vault) {
                revert OnlyVaultAllowed();
            }
        }

        super._update(from, to, value);
    }
}
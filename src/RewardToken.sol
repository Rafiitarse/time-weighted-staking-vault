// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Reward Token
/// @author Lintar Ar' Rafii
/// @notice ERC-20 token minted by the staking vault as a reward for eligible
///         withdrawals from staking positions.
/// @dev Only the configured staking vault can mint reward tokens. The token
///      supply is therefore controlled by the vault's reward calculation logic.
contract RewardToken is ERC20 {

    /// @notice The staking vault authorized to mint reward tokens.
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

    /// @notice Creates the reward token and assigns the staking vault as
    ///         the authorized token minter.
    /// @param _vault The address of the staking vault contract.
    constructor(address _vault)
        ERC20("Reward Token", "RWD")
    {
        require(
            _vault != address(0),
            "Invalid vault address"
        );

        vault = _vault;
    }

    /// @notice Mints reward tokens to an address.
    /// @dev Only the configured staking vault can mint reward tokens.
    /// @param to The address that will receive the minted reward tokens.
    /// @param amount The amount of reward tokens to mint.
    function mint(
        address to,
        uint256 amount
    ) external onlyVault {
        _mint(to, amount);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Conviction Rewards
/// @notice Fixed-supply reward token for the Conviction Vault protocol.
/// @dev The full supply is minted to the treasury at deployment; no minting
///      authority or administrative controls exist after construction.
contract ConvictionRewards is ERC20 {
    /// @notice Maximum and initial CVR supply, with 18 decimals.
    uint256 public constant SUPPLY_CAP = 10_000_000 ether;

    /// @notice Thrown when the constructor receives a zero treasury address.
    error InvalidTreasury(address treasury);

    /// @notice Creates CVR and mints its full fixed supply to the treasury.
    /// @param treasury The address that initially holds the capped CVR supply.
    constructor(address treasury) ERC20("Conviction Rewards", "CVR") {
        if (treasury == address(0)) revert InvalidTreasury(treasury);
        _mint(treasury, SUPPLY_CAP);
    }
}

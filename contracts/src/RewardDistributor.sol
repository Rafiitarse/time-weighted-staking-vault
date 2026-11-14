// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Configuration read interface for the reward distributor.
interface IRewardDistributorConfig {
    /// @notice Returns the vault configured in the distributor.
    function vault() external view returns (address);

    /// @notice Returns the reward token configured in the distributor.
    function rewardToken() external view returns (address);
}

/// @notice Interface for the reward distributor required by the Conviction Vault.
interface IRewardDistributor is IRewardDistributorConfig {
    /// @notice Permits any CVR holder to fund the reward pool.
    function fund(uint256 amount) external;

    /// @notice Payouts reward to position owner. Callable only by the configured vault.
    function payoutReward(address to, uint256 amount) external returns (bool);
}

/// @title Reward Distributor
/// @notice Treasury-funded reward pool for the Conviction Vault protocol.
/// @dev Holds CVR tokens and pays out one-time maturity bonuses upon withdrawal.
///      Distributor has no admin, pause, or sweep functions; all-or-zero payouts.
contract RewardDistributor is IRewardDistributor, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Vault authorized to request reward payouts.
    address public immutable override vault;

    /// @notice CVR reward token held and distributed by this pool.
    address public immutable override rewardToken;

    /// @notice Emitted when rewards are funded into the pool.
    event RewardFunded(address indexed funder, uint256 amount);

    /// @notice Emitted when a reward payout is made to a position owner.
    event RewardPaid(address indexed recipient, uint256 amount);

    /// @notice Thrown when an address argument is zero or invalid.
    error InvalidAddress(address account);

    /// @notice Thrown when an unauthorized caller attempts a payout.
    error OnlyVault(address caller);

    /// @notice Thrown when funding with zero amount.
    error ZeroAmount();

    /// @notice Deploys the distributor bound immutably to the vault and reward token.
    /// @param vault_ The address of the ConvictionVault contract.
    /// @param rewardToken_ The address of the ConvictionRewards (CVR) contract.
    constructor(address vault_, address rewardToken_) {
        if (vault_ == address(0) || vault_.code.length == 0) revert InvalidAddress(vault_);
        if (rewardToken_ == address(0) || rewardToken_.code.length == 0) revert InvalidAddress(rewardToken_);
        vault = vault_;
        rewardToken = rewardToken_;
    }

    /// @notice Returns the remaining CVR balance available in the pool.
    function availableRewards() external view returns (uint256) {
        return IERC20(rewardToken).balanceOf(address(this));
    }

    /// @notice Permits any CVR holder to fund the reward pool.
    /// @param amount Amount of CVR to deposit into the distributor.
    function fund(uint256 amount) external override nonReentrant {
        if (amount == 0) revert ZeroAmount();
        emit RewardFunded(msg.sender, amount);
        IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Payouts quoted maturity reward to the position owner.
    /// @dev Called only by the vault during principal withdrawal.
    ///      Returns false if the pool cannot cover the full amount (all-or-zero).
    /// @param to Position owner receiving CVR.
    /// @param amount Quoted reward in CVR wei.
    /// @return paid Whether the full quoted reward was transferred.
    function payoutReward(address to, uint256 amount) external override nonReentrant returns (bool) {
        if (msg.sender != vault) revert OnlyVault(msg.sender);
        if (to == address(0)) revert InvalidAddress(to);
        if (amount == 0) return true;

        uint256 balance = IERC20(rewardToken).balanceOf(address(this));
        if (balance < amount) {
            return false;
        }

        emit RewardPaid(to, amount);
        IERC20(rewardToken).safeTransfer(to, amount);
        return true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Staking Vault
/// @author Lintar Ar' Rafii
/// @notice Holds users' ETH deposits, tracks individual deposit lots, and
///         distributes reward tokens based on the age of each deposit lot.
/// @dev Each deposit creates a separate lot identified by its index in the
///      depositor's lot array. An equivalent amount of receipt tokens is
///      minted when ETH is deposited and burned when ETH is withdrawn.
///      The vault is also responsible for minting reward tokens.
interface ITokenMintable {
    /// @notice Mints tokens to a specified address.
    /// @param to The address that will receive the minted tokens.
    /// @param amount The amount of tokens to mint.
    function mint(address to, uint256 amount) external;

    /// @notice Burns tokens from a specified address.
    /// @param from The address whose tokens will be burned.
    /// @param amount The amount of tokens to burn.
    function burn(address from, uint256 amount) external;

    /// @notice Returns the token balance of an account.
    /// @param account The address whose token balance will be queried.
    /// @return The token balance of the specified account.
    function balanceOf(address account) external view returns (uint256);
}

/// @title Staking Vault
/// @author Lintar Ar' Rafii
/// @notice Manages ETH staking positions represented by individual deposit lots.
/// @dev The vault uses a receipt token to represent deposited ETH and a reward
///      token to distribute rewards when users withdraw from eligible lots.
///      Deposits and withdrawals can be paused by the owner.
contract StakingVault is ReentrancyGuard, Pausable, Ownable {

    /// @notice The receipt token contract used to represent users' deposited ETH.
    ITokenMintable public receiptToken;

    /// @notice The reward token contract minted as a reward when eligible ETH is withdrawn.
    ITokenMintable public rewardToken;

    /// @notice Represents an individual ETH deposit made by a user.
    /// @dev The amount is stored as uint128 and the deposit timestamp as uint64
    ///      to reduce storage usage while retaining sufficient range for the
    ///      intended staking parameters.
    struct DepositLot {
        /// @notice The amount of ETH currently remaining in this deposit lot.
        uint128 amount;

        /// @notice The timestamp at which this deposit lot was created.
        uint64 timestamp;
    }

    /// @notice Stores all deposit lots belonging to each user.
    /// @dev Each new deposit creates a new lot whose ID is the previous array length.
    mapping(address => DepositLot[]) public userLots;

    /// @notice Emitted when a user deposits ETH and a new deposit lot is created.
    /// @param user The address that made the deposit.
    /// @param lotId The ID of the newly created deposit lot.
    /// @param amount The amount of ETH deposited.
    /// @param timestamp The block timestamp at which the deposit was recorded.
    event Deposited(
        address indexed user,
        uint256 lotId,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when a user withdraws ETH from a deposit lot.
    /// @param user The address that made the withdrawal.
    /// @param lotId The ID of the deposit lot from which ETH was withdrawn.
    /// @param amount The amount of ETH withdrawn.
    /// @param rewardAmount The amount of reward tokens minted for the withdrawal.
    event Withdrawn(
        address indexed user,
        uint256 lotId,
        uint256 amount,
        uint256 rewardAmount
    );

    /// @notice Emitted when the receipt and reward token contracts are configured.
    /// @param receiptToken The address of the configured receipt token contract.
    /// @param rewardToken The address of the configured reward token contract.
    event TokensSet(
        address indexed receiptToken,
        address indexed rewardToken
    );

    /// @notice Thrown when an operation receives a zero amount.
    error ZeroAmount();

    /// @notice Thrown when the caller does not have enough receipt tokens
    ///         to cover the requested withdrawal.
    error InsufficientReceiptBalance();

    /// @notice Thrown when sending ETH to the caller fails.
    error TransferFailed();

    /// @notice Thrown when a requested deposit lot ID does not exist.
    error InvalidLotId();

    /// @notice Thrown when the requested withdrawal amount exceeds the
    ///         remaining amount in the selected deposit lot.
    error InsufficientLotAmount();

    /// @notice Thrown when the receipt token has not yet been configured.
    error TokensNotSet();

    /// @notice Thrown when an attempt is made to configure the token contracts
    ///         after the receipt token has already been set.
    error TokensAlreadySet();

    /// @notice Initializes the staking vault and sets the deployer as the owner.
    constructor() Ownable(msg.sender) {}

    /// @notice Configures the receipt token and reward token contracts.
    /// @dev Token configuration can only be performed once. The caller must
    ///      have ownership of the vault.
    /// @param _receiptToken The address of the receipt token contract.
    /// @param _rewardToken The address of the reward token contract.
    function setTokens(
        address _receiptToken,
        address _rewardToken
    ) external onlyOwner {
        if (address(receiptToken) != address(0) || address(rewardToken) != address(0)) revert TokensAlreadySet();
        receiptToken = ITokenMintable(_receiptToken);
        rewardToken = ITokenMintable(_rewardToken);

        emit TokensSet(_receiptToken, _rewardToken);
    }

    /// @notice Pauses deposits and withdrawals.
    /// @dev Only the vault owner can pause the contract.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses deposits and withdrawals.
    /// @dev Only the vault owner can unpause the contract.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Deposits ETH into the vault and creates a new deposit lot.
    /// @dev The deposited amount is recorded with the current block timestamp,
    ///      and an equivalent amount of receipt tokens is minted to the caller.
    ///      Deposits are disabled while the vault is paused.
    function deposit()
        external
        payable
        whenNotPaused
        nonReentrant
    {
        if (address(receiptToken) == address(0)) revert TokensNotSet();
        if (msg.value == 0) revert ZeroAmount();

        uint256 newLotId = userLots[msg.sender].length;

        userLots[msg.sender].push(
            DepositLot({
                amount: uint128(msg.value),
                timestamp: uint64(block.timestamp)
            })
        );

        receiptToken.mint(msg.sender, msg.value);

        emit Deposited(
            msg.sender,
            newLotId,
            msg.value,
            block.timestamp
        );
    }

    /// @notice Calculates the reward multiplier for a deposit lot based on its age.
    /// @dev The multiplier is expressed in thousandths and increases at fixed
    ///      holding-period thresholds:
    ///      - 0 for deposits younger than 183 days
    ///      - 150 after 183 days
    ///      - 200 after 366 days
    ///      - 250 after 549 days
    ///      - 300 after 732 days
    ///      - 350 after 915 days
    ///      - 400 after 1098 days
    /// @param depositTimestamp The timestamp at which the deposit lot was created.
    /// @return multiplier The reward multiplier expressed in thousandths.
    function _calculateLotMultiplier(
        uint256 depositTimestamp
    ) internal view returns (uint256 multiplier) {
        uint256 age = block.timestamp - depositTimestamp;

        if (age >= 1098 days) return 400;
        if (age >= 915 days) return 350;
        if (age >= 732 days) return 300;
        if (age >= 549 days) return 250;
        if (age >= 366 days) return 200;
        if (age >= 183 days) return 150;
        return 0;
    }

    /// @notice Withdraws ETH from a specific deposit lot and mints the
    ///         corresponding reward tokens.
    /// @dev The reward is calculated from the age of the selected deposit lot
    ///      and the amount being withdrawn. The original timestamp of the lot
    ///      is preserved when only part of the lot is withdrawn.
    ///      The corresponding amount of receipt tokens is burned before the
    ///      ETH is transferred to the caller.
    /// @param lotId The ID of the deposit lot from which ETH will be withdrawn.
    /// @param amount The amount of ETH to withdraw from the selected lot.
    function withdrawFromLot(
        uint256 lotId,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (lotId >= userLots[msg.sender].length) revert InvalidLotId();

        DepositLot storage currentLot = userLots[msg.sender][lotId];

        if (currentLot.amount < amount) revert InsufficientLotAmount();
        if (receiptToken.balanceOf(msg.sender) < amount) {
            revert InsufficientReceiptBalance();
        }

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

        emit Withdrawn(
            msg.sender,
            lotId,
            amount,
            totalReward
        );
    }

    /// @notice Returns all deposit lots belonging to a user.
    /// @param user The address whose deposit lots will be returned.
    /// @return The complete array of deposit lots belonging to the specified user.
    function getUserLots(
        address user
    ) external view returns (DepositLot[] memory) {
        return userLots[user];
    }
}
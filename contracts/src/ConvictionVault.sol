// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IRewardDistributor, IRewardDistributorConfig} from "./RewardDistributor.sol";

/// @title Conviction Vault
/// @notice Custodies ETH and represents each deposit lot with a transferable CVP NFT.
/// @dev Position ownership carries the right to withdraw its remaining principal
///      and receive attributable CVR rewards.
contract ConvictionVault is ERC721, ReentrancyGuard, Pausable, AccessControlDefaultAdminRules {
    /// @notice Role authorized to pause new deposits.
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    /// @notice Fixed delay required for a default-admin transfer.
    uint48 public constant DEFAULT_ADMIN_TRANSFER_DELAY = 2 days;

    /// @notice Reason why quoted reward was not paid during withdrawal.
    enum RewardSkippedReason {
        INSUFFICIENT_POOL_BALANCE,
        DISTRIBUTOR_CALL_FAILED
    }

    /// @notice Position data keyed by its unique, never-reused token ID.
    struct Position {
        uint128 remainingPrincipal;
        uint64 depositedAt;
    }

    /// @notice The next token ID to assign to a deposited position.
    uint256 public nextTokenId = 1;

    /// @notice Remaining principal and original timestamp for each CVP token.
    mapping(uint256 tokenId => Position) public positions;

    /// @notice Configured reward distributor; deposits are disabled until set.
    IRewardDistributor public rewardDistributor;

    /// @notice CVR token address reported by the configured distributor.
    address public rewardToken;

    /// @notice Emitted when ETH is deposited and a new CVP NFT is minted.
    event Deposited(address indexed depositor, uint256 indexed tokenId, uint256 amount, uint256 depositedAt);

    /// @notice Emitted when principal is withdrawn from a CVP position.
    event Withdrawn(address indexed owner, address indexed recipient, uint256 indexed tokenId, uint256 amount);

    /// @notice Emitted when a maturity reward is successfully paid to the position owner.
    event RewardPaid(address indexed owner, uint256 indexed tokenId, uint256 amount, uint256 multiplier);

    /// @notice Emitted when a quoted reward could not be paid during withdrawal.
    event RewardSkipped(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 requestedAmount,
        RewardSkippedReason reason
    );

    /// @notice Emitted when the one-time reward distributor configuration succeeds.
    event RewardDistributorSet(address indexed distributor, address indexed rewardToken);

    /// @notice Thrown when a required address is zero or invalid.
    error InvalidAddress(address account);

    /// @notice Thrown when a deposit exceeds the amount field's storage width.
    error AmountExceedsPositionLimit(uint256 amount);

    /// @notice Thrown when the current timestamp exceeds the timestamp field's storage width.
    error TimestampExceedsPositionLimit(uint256 timestamp);

    /// @notice Thrown when deposits are attempted before distributor setup.
    error RewardDistributorNotSet();

    /// @notice Thrown when a distributor is invalid or does not expose its configuration.
    error InvalidRewardDistributor(address distributor);

    /// @notice Thrown when the distributor points to a different vault.
    error RewardDistributorVaultMismatch(address actualVault);

    /// @notice Thrown when the caller is not the current CVP owner.
    error NotPositionOwner(address caller, uint256 tokenId);

    /// @notice Thrown when an operation uses a zero amount.
    error ZeroAmount();

    /// @notice Thrown when a withdrawal exceeds the position's remaining principal.
    error InsufficientPositionPrincipal(uint256 available, uint256 requested);

    /// @notice Thrown when a position transfer or ETH payout targets the vault.
    error InvalidPositionRecipient(address recipient);

    /// @notice Thrown when ETH delivery to the selected recipient fails.
    error TransferFailed(address recipient, uint256 amount);

    /// @notice Thrown when the default-admin delay is changed or default admin renounced.
    error DefaultAdminConfigurationImmutable();

    /// @notice Creates the CVP collection and assigns the Safe and guardian roles.
    /// @param initialAdmin Safe address that will administer the vault.
    /// @param initialGuardian Separate address authorized to pause deposits.
    constructor(address initialAdmin, address initialGuardian)
        ERC721("Conviction Position", "CVP")
        AccessControlDefaultAdminRules(DEFAULT_ADMIN_TRANSFER_DELAY, initialAdmin)
    {
        if (initialGuardian == address(0) || initialGuardian == initialAdmin) {
            revert InvalidAddress(initialGuardian);
        }
        _grantRole(GUARDIAN_ROLE, initialGuardian);
    }

    /// @notice Keeps the approved default-admin transfer delay fixed at 48 hours.
    /// @param newDelay Requested delay; only the immutable approved delay is accepted.
    function changeDefaultAdminDelay(uint48 newDelay) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newDelay != DEFAULT_ADMIN_TRANSFER_DELAY) {
            revert DefaultAdminConfigurationImmutable();
        }
        super.changeDefaultAdminDelay(newDelay);
    }

    /// @notice Prevents accidental loss of default-admin control.
    /// @param role Role the caller requests to renounce.
    /// @param account Account that is expected to renounce the role.
    function renounceRole(bytes32 role, address account) public override {
        if (role == DEFAULT_ADMIN_ROLE) revert DefaultAdminConfigurationImmutable();
        super.renounceRole(role, account);
    }

    /// @notice Reports interfaces supported by the NFT and access-control roles.
    /// @param interfaceId Interface identifier to check.
    /// @return supported Whether the interface is supported.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControlDefaultAdminRules)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Configures the distributor once and verifies its vault and CVR references.
    /// @param distributor Address of the deployed reward distributor.
    function setRewardDistributor(address distributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(rewardDistributor) != address(0)) revert InvalidRewardDistributor(distributor);
        if (distributor == address(0) || distributor.code.length == 0) {
            revert InvalidRewardDistributor(distributor);
        }

        address configuredVault = address(0);
        address configuredRewardToken = address(0);
        try IRewardDistributor(distributor).vault() returns (address value) {
            configuredVault = value;
        } catch {
            revert InvalidRewardDistributor(distributor);
        }
        try IRewardDistributor(distributor).rewardToken() returns (address value) {
            configuredRewardToken = value;
        } catch {
            revert InvalidRewardDistributor(distributor);
        }

        if (configuredVault != address(this)) {
            revert RewardDistributorVaultMismatch(configuredVault);
        }
        if (configuredRewardToken == address(0) || configuredRewardToken.code.length == 0) {
            revert InvalidRewardDistributor(distributor);
        }

        rewardDistributor = IRewardDistributor(distributor);
        rewardToken = configuredRewardToken;
        emit RewardDistributorSet(distributor, configuredRewardToken);
    }

    /// @notice Pauses new deposits without affecting transfers or withdrawals.
    function pauseDeposits() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    /// @notice Re-enables deposits.
    function unpauseDeposits() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Deposits ETH and mints one CVP NFT representing this lot.
    function deposit() external payable nonReentrant whenNotPaused returns (uint256 tokenId) {
        if (address(rewardDistributor) == address(0)) revert RewardDistributorNotSet();
        if (msg.value == 0) revert ZeroAmount();
        if (msg.value > type(uint128).max) revert AmountExceedsPositionLimit(msg.value);
        if (block.timestamp > type(uint64).max) {
            revert TimestampExceedsPositionLimit(block.timestamp);
        }

        tokenId = nextTokenId++;
        positions[tokenId] = Position({
            remainingPrincipal: SafeCast.toUint128(msg.value), depositedAt: SafeCast.toUint64(block.timestamp)
        });

        emit Deposited(msg.sender, tokenId, msg.value, block.timestamp);
        _safeMint(msg.sender, tokenId);
    }

    /// @notice Withdraws principal from a position to a user-selected recipient.
    /// @dev Only the current NFT owner may withdraw; token approvals authorize
    ///      transfers only. Reward payout is requested from RewardDistributor and
    ///      sent directly to the current owner. If the pool cannot cover the full
    ///      reward or the distributor call fails, reward is skipped without blocking
    ///      principal delivery.
    /// @param tokenId CVP position to withdraw from.
    /// @param amount Principal amount to withdraw in wei.
    /// @param recipient Nonzero address that will receive the ETH.
    function withdraw(uint256 tokenId, uint256 amount, address payable recipient) external nonReentrant {
        address currentOwner = ownerOf(tokenId);
        if (msg.sender != currentOwner) revert NotPositionOwner(msg.sender, tokenId);
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0) || recipient == address(this)) {
            revert InvalidPositionRecipient(recipient);
        }

        Position storage position = positions[tokenId];
        uint256 available = position.remainingPrincipal;
        if (amount > available) revert InsufficientPositionPrincipal(available, amount);

        (uint256 multiplier, uint256 rewardAmount) = _calculateReward(position.depositedAt, amount);

        position.remainingPrincipal = SafeCast.toUint128(available - amount);
        if (amount == available) {
            delete positions[tokenId];
            _burn(tokenId);
        }

        emit Withdrawn(currentOwner, recipient, tokenId, amount);

        if (rewardAmount > 0) {
            try rewardDistributor.payoutReward(currentOwner, rewardAmount) returns (bool paid) {
                if (paid) {
                    emit RewardPaid(currentOwner, tokenId, rewardAmount, multiplier);
                } else {
                    emit RewardSkipped(
                        currentOwner,
                        tokenId,
                        rewardAmount,
                        RewardSkippedReason.INSUFFICIENT_POOL_BALANCE
                    );
                }
            } catch {
                emit RewardSkipped(
                    currentOwner,
                    tokenId,
                    rewardAmount,
                    RewardSkippedReason.DISTRIBUTOR_CALL_FAILED
                );
            }
        }

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed(recipient, amount);
    }

    /// @notice Quotes the approved one-time maturity bonus for a position withdrawal.
    /// @param tokenId CVP position to quote.
    /// @param amount Principal amount to quote in wei.
    /// @return multiplier Reward multiplier in thousandths.
    /// @return rewardAmount Reward amount in CVR wei, rounded down.
    function quoteReward(uint256 tokenId, uint256 amount)
        external
        view
        returns (uint256 multiplier, uint256 rewardAmount)
    {
        ownerOf(tokenId);
        if (amount == 0) revert ZeroAmount();

        Position memory position = positions[tokenId];
        if (amount > position.remainingPrincipal) {
            revert InsufficientPositionPrincipal(position.remainingPrincipal, amount);
        }

        return _calculateReward(position.depositedAt, amount);
    }

    /// @dev Calculates the approved one-time maturity bonus for a withdrawal.
    /// @param depositedAt Deposit timestamp of the lot.
    /// @param amount Principal amount being withdrawn.
    /// @return multiplier Reward multiplier in thousandths.
    /// @return rewardAmount Reward amount in CVR wei, rounded down.
    function _calculateReward(uint256 depositedAt, uint256 amount)
        internal
        view
        returns (uint256 multiplier, uint256 rewardAmount)
    {
        uint256 age = block.timestamp - depositedAt;
        if (age >= 1098 days) multiplier = 150;
        else if (age >= 915 days) multiplier = 125;
        else if (age >= 732 days) multiplier = 100;
        else if (age >= 549 days) multiplier = 75;
        else if (age >= 366 days) multiplier = 50;
        else if (age >= 183 days) multiplier = 25;

        rewardAmount = (amount * multiplier) / 1000;
    }

    /// @dev Rejects transfers to the vault so positions cannot be stranded.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (to == address(this)) revert InvalidPositionRecipient(to);
        return super._update(to, tokenId, auth);
    }
}

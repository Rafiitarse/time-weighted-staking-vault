import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import {
  Deposited as DepositedEvent,
  Withdrawn as WithdrawnEvent,
  TokensSet as TokensSetEvent,
} from "../generated/StakingVault/StakingVault";
import {
  User,
  DepositLot,
  LotWithdrawal,
  ProtocolStat,
} from "../generated/schema";

// Singleton id for the protocol-wide ProtocolStat entity.
const PROTOCOL_STAT_ID = "global";

// LotStatus enum values — graph-node stores GraphQL enums as plain strings.
const STATUS_ACTIVE = "ACTIVE";
const STATUS_CLOSED = "CLOSED";

/**
 * Loads the User entity for `address`, creating it with zeroed totals the
 * first time this address is seen.
 */
function getOrCreateUser(address: Address): User {
  let user = User.load(address);

  if (user == null) {
    user = new User(address);
    user.totalEthStaked = BigInt.zero();
    user.totalRewardEarned = BigInt.zero();
    user.save();
  }

  return user as User;
}

/**
 * Loads the singleton ProtocolStat entity, creating it with zeroed
 * counters the first time any handler runs.
 */
function getOrCreateProtocolStat(): ProtocolStat {
  let stat = ProtocolStat.load(PROTOCOL_STAT_ID);

  if (stat == null) {
    stat = new ProtocolStat(PROTOCOL_STAT_ID);
    stat.totalEthStakedAllUsers = BigInt.zero();
    stat.totalRewardsDistributed = BigInt.zero();
    stat.totalLotsCreated = BigInt.zero();
    stat.save();
  }

  return stat as ProtocolStat;
}

/**
 * Builds the deterministic DepositLot id from the depositor's address and
 * the on-chain lotId. This mirrors userLots[user][lotId] on-chain, so the
 * same id can be recomputed in handleWithdrawn from the Withdrawn event's
 * (user, lotId) pair.
 */
function buildLotId(user: Address, lotId: BigInt): string {
  return user.toHexString() + "-" + lotId.toString();
}

/**
 * Handles the `Deposited` event, emitted every time `deposit()` is called.
 * Creates a brand new DepositLot (lots are never reused on-chain — each
 * deposit pushes a new array element) and bumps the running totals on both
 * the User and the global ProtocolStat.
 */
export function handleDeposited(event: DepositedEvent): void {
  let user = getOrCreateUser(event.params.user);
  user.totalEthStaked = user.totalEthStaked.plus(event.params.amount);
  user.save();

  let lotEntityId = buildLotId(event.params.user, event.params.lotId);
  let lot = new DepositLot(lotEntityId);

  lot.user = user.id;
  lot.lotId = event.params.lotId;
  lot.originalAmount = event.params.amount;
  lot.remainingAmount = event.params.amount;
  lot.depositTimestamp = event.params.timestamp;
  lot.status = STATUS_ACTIVE;
  lot.save();

  let stat = getOrCreateProtocolStat();
  stat.totalEthStakedAllUsers = stat.totalEthStakedAllUsers.plus(
    event.params.amount
  );
  stat.totalLotsCreated = stat.totalLotsCreated.plus(BigInt.fromI32(1));
  stat.save();
}

/**
 * Handles the `Withdrawn` event, emitted every time `withdrawFromLot()` is
 * called. Reduces the matching lot's remainingAmount (closing it once it
 * hits zero), records a LotWithdrawal, and credits the reward to both the
 * User and the global ProtocolStat.
 */
export function handleWithdrawn(event: WithdrawnEvent): void {
  let user = getOrCreateUser(event.params.user);

  let lotEntityId = buildLotId(event.params.user, event.params.lotId);
  let lot = DepositLot.load(lotEntityId);

  if (lot == null) {
    // Should not happen in normal operation: withdrawFromLot() reverts
    // with InvalidLotId() unless the lot already exists on-chain, so its
    // Deposited event must have been indexed first. This can only trigger
    // if the subgraph's startBlock is set after that lot's deposit block.
    // We log it and still record the withdrawal + stats below so no
    // reward/ETH accounting is silently dropped.
    log.warning(
      "handleWithdrawn: DepositLot {} not found for user {} — was startBlock set after this lot's deposit?",
      [lotEntityId, event.params.user.toHexString()]
    );
  } else {
    lot.remainingAmount = lot.remainingAmount.minus(event.params.amount);

    if (lot.remainingAmount <= BigInt.zero()) {
      lot.remainingAmount = BigInt.zero();
      lot.status = STATUS_CLOSED;
    }

    lot.save();
  }

  let withdrawalId =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let withdrawal = new LotWithdrawal(withdrawalId);

  withdrawal.lot = lotEntityId;
  withdrawal.user = user.id;
  withdrawal.amountWithdrawn = event.params.amount;
  withdrawal.rewardAmount = event.params.rewardAmount;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.save();

  user.totalRewardEarned = user.totalRewardEarned.plus(
    event.params.rewardAmount
  );
  user.save();

  let stat = getOrCreateProtocolStat();
  stat.totalRewardsDistributed = stat.totalRewardsDistributed.plus(
    event.params.rewardAmount
  );
  stat.save();
}

/**
 * Handles the `TokensSet` event, emitted once by the owner via setTokens().
 * Records both token addresses on the global ProtocolStat entity for easy
 * lookup. Address already extends Bytes in graph-ts, so no explicit
 * Bytes.fromHexString() conversion is needed here.
 */
export function handleTokensSet(event: TokensSetEvent): void {
  let stat = getOrCreateProtocolStat();
  stat.receiptToken = event.params.receiptToken;
  stat.rewardToken = event.params.rewardToken;
  stat.save();
}

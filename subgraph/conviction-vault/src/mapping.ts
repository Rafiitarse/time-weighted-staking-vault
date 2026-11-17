import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  Deposited as DepositedEvent,
  RewardPaid as RewardPaidEvent,
  RewardSkipped as RewardSkippedEvent,
  Transfer as TransferEvent,
  Withdrawn as WithdrawnEvent,
} from "../generated/ConvictionVault/ConvictionVault";
import { RewardFunded as RewardFundedEvent } from "../generated/RewardDistributor/RewardDistributor";
import {
  Deposit,
  Position,
  PositionTransfer,
  ProtocolStats,
  RewardFunding,
  User,
  Withdrawal,
} from "../generated/schema";

const STATS_ID = "global";
const ZERO_ADDRESS = Address.zero();
const ZERO = BigInt.zero();
const ONE = BigInt.fromI32(1);

function getOrCreateStats(): ProtocolStats {
  let stats = ProtocolStats.load(STATS_ID);
  if (stats == null) {
    stats = new ProtocolStats(STATS_ID);
    stats.totalPrincipalDeposited = ZERO;
    stats.totalPrincipalWithdrawn = ZERO;
    stats.totalPrincipalRemaining = ZERO;
    stats.totalRewardsPaid = ZERO;
    stats.totalRewardsSkipped = ZERO;
    stats.totalRewardsFunded = ZERO;
    stats.positionCount = ZERO;
    stats.activePositionCount = ZERO;
    stats.save();
  }
  return stats as ProtocolStats;
}

function getOrCreateUser(address: Address): User {
  let user = User.load(address);
  if (user == null) {
    user = new User(address);
    user.totalPrincipalDeposited = ZERO;
    user.totalPrincipalWithdrawn = ZERO;
    user.totalRewardsPaid = ZERO;
    user.save();
  }
  return user as User;
}

function eventId(transactionHash: string, logIndex: BigInt): string {
  return transactionHash + "-" + logIndex.toString();
}

function withdrawalId(transactionHash: string, tokenId: BigInt): string {
  return transactionHash + "-" + tokenId.toString();
}

export function handleDeposited(event: DepositedEvent): void {
  let user = getOrCreateUser(event.params.depositor);
  user.totalPrincipalDeposited = user.totalPrincipalDeposited.plus(event.params.amount);
  user.save();

  let id = event.params.tokenId.toString();
  let position = new Position(id);
  position.tokenId = event.params.tokenId;
  position.depositor = event.params.depositor;
  position.owner = user.id;
  position.originalPrincipal = event.params.amount;
  position.remainingPrincipal = event.params.amount;
  position.depositedAt = event.params.depositedAt;
  position.status = "ACTIVE";
  position.save();

  let deposit = new Deposit(eventId(event.transaction.hash.toHexString(), event.logIndex));
  deposit.user = user.id;
  deposit.position = position.id;
  deposit.amount = event.params.amount;
  deposit.timestamp = event.block.timestamp;
  deposit.transactionHash = event.transaction.hash;
  deposit.blockNumber = event.block.number;
  deposit.save();

  let stats = getOrCreateStats();
  stats.totalPrincipalDeposited = stats.totalPrincipalDeposited.plus(event.params.amount);
  stats.totalPrincipalRemaining = stats.totalPrincipalRemaining.plus(event.params.amount);
  stats.positionCount = stats.positionCount.plus(ONE);
  stats.activePositionCount = stats.activePositionCount.plus(ONE);
  stats.save();
}

export function handleTransfer(event: TransferEvent): void {
  let position = Position.load(event.params.tokenId.toString());
  if (position == null) return;

  let from = event.params.from;
  let to = event.params.to;
  if (to.equals(ZERO_ADDRESS)) {
    position.owner = null;
  } else {
    let newOwner = getOrCreateUser(to);
    position.owner = newOwner.id;
  }
  position.save();

  let transfer = new PositionTransfer(
    eventId(event.transaction.hash.toHexString(), event.logIndex),
  );
  transfer.position = position.id;
  transfer.from = from;
  transfer.to = to;
  transfer.timestamp = event.block.timestamp;
  transfer.transactionHash = event.transaction.hash;
  transfer.save();
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  let owner = getOrCreateUser(event.params.owner);
  let position = Position.load(event.params.tokenId.toString());
  if (position == null) return;

  let remaining = position.remainingPrincipal;
  position.remainingPrincipal = remaining.minus(event.params.amount);
  if (position.remainingPrincipal.equals(ZERO)) {
    position.status = "CLOSED";
    let stats = getOrCreateStats();
    stats.activePositionCount = stats.activePositionCount.minus(ONE);
    stats.save();
  }
  position.save();

  owner.totalPrincipalWithdrawn = owner.totalPrincipalWithdrawn.plus(event.params.amount);
  owner.save();

  let id = withdrawalId(event.transaction.hash.toHexString(), event.params.tokenId);
  let withdrawal = new Withdrawal(id);
  withdrawal.position = position.id;
  withdrawal.user = owner.id;
  withdrawal.recipient = event.params.recipient;
  withdrawal.principal = event.params.amount;
  withdrawal.rewardRequested = ZERO;
  withdrawal.rewardPaid = ZERO;
  withdrawal.rewardOutcome = "NONE";
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.transactionHash = event.transaction.hash;
  withdrawal.blockNumber = event.block.number;
  withdrawal.save();

  let stats = getOrCreateStats();
  stats.totalPrincipalWithdrawn = stats.totalPrincipalWithdrawn.plus(event.params.amount);
  stats.totalPrincipalRemaining = stats.totalPrincipalRemaining.minus(event.params.amount);
  stats.save();
}

export function handleRewardPaid(event: RewardPaidEvent): void {
  let id = withdrawalId(event.transaction.hash.toHexString(), event.params.tokenId);
  let withdrawal = Withdrawal.load(id);
  if (withdrawal == null) return;

  withdrawal.rewardRequested = event.params.amount;
  withdrawal.rewardPaid = event.params.amount;
  withdrawal.rewardOutcome = "PAID";
  withdrawal.save();

  let user = User.load(event.params.owner);
  if (user != null) {
    user.totalRewardsPaid = user.totalRewardsPaid.plus(event.params.amount);
    user.save();
  }

  let stats = getOrCreateStats();
  stats.totalRewardsPaid = stats.totalRewardsPaid.plus(event.params.amount);
  stats.save();
}

export function handleRewardSkipped(event: RewardSkippedEvent): void {
  let id = withdrawalId(event.transaction.hash.toHexString(), event.params.tokenId);
  let withdrawal = Withdrawal.load(id);
  if (withdrawal == null) return;

  withdrawal.rewardRequested = event.params.requestedAmount;
  withdrawal.rewardPaid = ZERO;
  withdrawal.rewardOutcome = event.params.reason == 0
    ? "SKIPPED_INSUFFICIENT_POOL"
    : "SKIPPED_DISTRIBUTOR_FAILURE";
  withdrawal.save();

  let stats = getOrCreateStats();
  stats.totalRewardsSkipped = stats.totalRewardsSkipped.plus(event.params.requestedAmount);
  stats.save();
}

export function handleRewardFunded(event: RewardFundedEvent): void {
  let funding = new RewardFunding(
    eventId(event.transaction.hash.toHexString(), event.logIndex),
  );
  funding.funder = event.params.funder;
  funding.amount = event.params.amount;
  funding.timestamp = event.block.timestamp;
  funding.transactionHash = event.transaction.hash;
  funding.save();

  let stats = getOrCreateStats();
  stats.totalRewardsFunded = stats.totalRewardsFunded.plus(event.params.amount);
  stats.save();
}

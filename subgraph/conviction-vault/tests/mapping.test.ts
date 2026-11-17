import { assert, clearStore, describe, newMockEvent, test } from "matchstick-as/assembly/index";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  Deposited,
  RewardPaid,
  Transfer,
  Withdrawn,
} from "../generated/ConvictionVault/ConvictionVault";
import { RewardFunded as RewardFundedDistributor } from "../generated/RewardDistributor/RewardDistributor";
import {
  handleDeposited,
  handleRewardFunded,
  handleRewardPaid,
  handleTransfer,
  handleWithdrawn,
} from "../src/mapping";

const owner = Address.fromString("0x0000000000000000000000000000000000000001");
const recipient = Address.fromString("0x0000000000000000000000000000000000000002");
const zero = Address.zero();
const tokenId = BigInt.fromI32(7);

function add(event: ethereum.Event, name: string, value: ethereum.Value): void {
  event.parameters.push(new ethereum.EventParam(name, value));
}

function deposited(): Deposited {
  let event = changetype<Deposited>(newMockEvent());
  event.parameters = new Array();
  event.logIndex = BigInt.fromI32(1);
  add(event, "depositor", ethereum.Value.fromAddress(owner));
  add(event, "tokenId", ethereum.Value.fromUnsignedBigInt(tokenId));
  add(event, "amount", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(10)));
  add(event, "depositedAt", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(100)));
  return event;
}

function transfer(from: Address, to: Address): Transfer {
  let event = changetype<Transfer>(newMockEvent());
  event.parameters = new Array();
  event.logIndex = BigInt.fromI32(2);
  add(event, "from", ethereum.Value.fromAddress(from));
  add(event, "to", ethereum.Value.fromAddress(to));
  add(event, "tokenId", ethereum.Value.fromUnsignedBigInt(tokenId));
  return event;
}

function withdrawn(): Withdrawn {
  let event = changetype<Withdrawn>(newMockEvent());
  event.parameters = new Array();
  event.logIndex = BigInt.fromI32(3);
  add(event, "owner", ethereum.Value.fromAddress(owner));
  add(event, "recipient", ethereum.Value.fromAddress(recipient));
  add(event, "tokenId", ethereum.Value.fromUnsignedBigInt(tokenId));
  add(event, "amount", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(4)));
  return event;
}

function rewardPaid(): RewardPaid {
  let event = changetype<RewardPaid>(newMockEvent());
  event.parameters = new Array();
  event.logIndex = BigInt.fromI32(4);
  add(event, "owner", ethereum.Value.fromAddress(owner));
  add(event, "tokenId", ethereum.Value.fromUnsignedBigInt(tokenId));
  add(event, "amount", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)));
  add(event, "multiplier", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(25)));
  return event;
}

function rewardFunded(): RewardFundedDistributor {
  let event = changetype<RewardFundedDistributor>(newMockEvent());
  event.parameters = new Array();
  event.logIndex = BigInt.fromI32(5);
  add(event, "funder", ethereum.Value.fromAddress(owner));
  add(event, "amount", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(20)));
  return event;
}

describe("Conviction Vault accounting", () => {
  test("tracks deposits, ownership, withdrawals, rewards, and funding", () => {
    handleDeposited(deposited());
    handleTransfer(transfer(zero, owner));
    handleWithdrawn(withdrawn());
    handleRewardPaid(rewardPaid());
    handleRewardFunded(rewardFunded());

    assert.fieldEquals("Position", "7", "owner", owner.toHexString());
    assert.fieldEquals("Position", "7", "originalPrincipal", "10");
    assert.fieldEquals("Position", "7", "remainingPrincipal", "6");
    assert.fieldEquals("Position", "7", "status", "ACTIVE");
    assert.entityCount("PositionTransfer", 1);
    const withdrawalId = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-7";
    assert.fieldEquals("Withdrawal", withdrawalId, "principal", "4");
    assert.fieldEquals("Withdrawal", withdrawalId, "rewardPaid", "1");
    assert.fieldEquals("Withdrawal", withdrawalId, "rewardOutcome", "PAID");
    assert.fieldEquals("ProtocolStats", "global", "totalPrincipalRemaining", "6");
    assert.fieldEquals("ProtocolStats", "global", "totalRewardsPaid", "1");
    assert.fieldEquals("ProtocolStats", "global", "totalRewardsFunded", "20");
    assert.entityCount("RewardFunding", 1);

    clearStore();
  });
});

import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts";
import { Deposited } from "../generated/StakingVault/StakingVault";

export function createDepositedEvent(
  user: Address,
  lotId: BigInt,
  amount: BigInt,
  timestamp: BigInt,
): Deposited {
  const event = changetype<Deposited>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(new ethereum.EventParam("user", ethereum.Value.fromAddress(user)));
  event.parameters.push(new ethereum.EventParam("lotId", ethereum.Value.fromUnsignedBigInt(lotId)));
  event.parameters.push(new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount)));
  event.parameters.push(new ethereum.EventParam("timestamp", ethereum.Value.fromUnsignedBigInt(timestamp)));
  return event;
}

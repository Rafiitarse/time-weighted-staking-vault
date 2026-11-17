import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { handleDeposited } from "../src/staking-vault"
import { createDepositedEvent } from "./staking-vault-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("legacy StakingVault deposits", () => {
  beforeAll(() => {
    let user = Address.fromString("0x0000000000000000000000000000000000000001")
    let lotId = BigInt.fromI32(234)
    let amount = BigInt.fromI32(234)
    let timestamp = BigInt.fromI32(234)
    let newDepositedEvent = createDepositedEvent(user, lotId, amount, timestamp)
    handleDeposited(newDepositedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  test("creates the lot and updates user and protocol totals", () => {
    assert.entityCount("DepositLot", 1)
    assert.entityCount("User", 1)
    assert.entityCount("ProtocolStat", 1)

    let userId = "0x0000000000000000000000000000000000000001"
    let lotId = userId + "-234"
    assert.fieldEquals(
      "DepositLot",
      lotId,
      "user",
      userId
    )
    assert.fieldEquals(
      "DepositLot",
      lotId,
      "originalAmount",
      "234"
    )
    assert.fieldEquals(
      "DepositLot",
      lotId,
      "remainingAmount",
      "234"
    )
    assert.fieldEquals(
      "DepositLot",
      lotId,
      "depositTimestamp",
      "234"
    )
    assert.fieldEquals("User", userId, "totalEthStaked", "234")
    assert.fieldEquals("ProtocolStat", "global", "totalEthStakedAllUsers", "234")
    assert.fieldEquals("ProtocolStat", "global", "totalLotsCreated", "1")
  })
})

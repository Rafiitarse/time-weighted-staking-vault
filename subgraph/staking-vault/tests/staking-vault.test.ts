import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { Deposited } from "../generated/schema"
import { Deposited as DepositedEvent } from "../generated/StakingVault/StakingVault"
import { handleDeposited } from "../src/staking-vault"
import { createDepositedEvent } from "./staking-vault-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
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

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("Deposited created and stored", () => {
    assert.entityCount("Deposited", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "Deposited",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "user",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "Deposited",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "lotId",
      "234"
    )
    assert.fieldEquals(
      "Deposited",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "amount",
      "234"
    )
    assert.fieldEquals(
      "Deposited",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "timestamp",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const subgraphDir = resolve(here, "..");
const repoRoot = resolve(subgraphDir, "../..");
const network = process.env.NETWORK_NAME ?? "sepolia";
const metadataPath = process.env.DEPLOYMENT_METADATA
  ? resolve(process.env.DEPLOYMENT_METADATA)
  : resolve(repoRoot, "deployments", `${network}.json`);

function fail(message) {
  console.error(`Conviction subgraph metadata: ${message}`);
  process.exit(1);
}

let metadata;
try {
  metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
} catch (error) {
  fail(`cannot read ${metadataPath}: ${error.message}`);
}

if (metadata.network !== network) {
  fail(`network mismatch: requested ${network}, metadata says ${String(metadata.network)}`);
}
if (!Number.isSafeInteger(metadata.startBlock) || metadata.startBlock < 0) {
  fail("startBlock must be a non-negative safe integer");
}

const addresses = {
  convictionVault: metadata.contracts?.convictionVault,
  rewardDistributor: metadata.contracts?.rewardDistributor,
};
for (const [name, address] of Object.entries(addresses)) {
  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    fail(`${name} is not a 20-byte address`);
  }
  if (address.toLowerCase() === "0x0000000000000000000000000000000000000000" && process.env.ALLOW_UNCONFIGURED !== "1") {
    fail(`${name} is zero; refusing to prepare a deployable manifest`);
  }
}

const template = readFileSync(resolve(subgraphDir, "subgraph.template.yaml"), "utf8");
const manifest = template
  .replaceAll("__NETWORK__", network)
  .replaceAll("__CONVICTION_VAULT__", addresses.convictionVault)
  .replaceAll("__REWARD_DISTRIBUTOR__", addresses.rewardDistributor)
  .replaceAll("__START_BLOCK__", String(metadata.startBlock));
writeFileSync(resolve(subgraphDir, "../staking-vault/conviction-subgraph.yaml"), manifest);

const sources = [
  ["conviction-vault.json", "ConvictionVault"],
  ["reward-distributor.json", "RewardDistributor"],
];
const abiDir = resolve(subgraphDir, "abis");
mkdirSync(abiDir, { recursive: true });
for (const [sourceName, contractName] of sources) {
  const sourcePath = resolve(repoRoot, "frontend", "abis", sourceName);
  const parsed = JSON.parse(readFileSync(sourcePath, "utf8"));
  if (!Array.isArray(parsed.abi) || parsed.abi.length === 0) {
    fail(`${sourcePath} has no ABI array`);
  }
  writeFileSync(
    resolve(abiDir, `${contractName}.json`),
    `${JSON.stringify(parsed.abi, null, 2)}\n`,
  );
}

console.log(`Rendered Conviction subgraph for ${network} from ${metadataPath}`);

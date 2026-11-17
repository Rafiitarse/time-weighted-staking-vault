/**
 * Sync contract ABIs from Foundry artifacts into frontend/abis/.
 *
 * Source of truth: contracts/out/<SourceFile>/<ContractName>.json (emitted by
 * `forge build` in contracts/). No hand-maintained ABI is allowed anywhere in
 * the frontend; rerun this after any contract change.
 *
 * Usage: node scripts/sync-abis.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(here, "..");
const repoRoot = resolve(frontendDir, "..");
const outDir = resolve(repoRoot, "contracts", "out");

// [artifact path relative to contracts/out, destination file in frontend/abis]
const SOURCES = [
  ["ConvictionVault.sol/ConvictionVault.json", "conviction-vault.json"],
  ["ConvictionRewards.sol/ConvictionRewards.json", "conviction-rewards.json"],
  ["RewardDistributor.sol/RewardDistributor.json", "reward-distributor.json"],
  ["StakingVault.sol/StakingVault.json", "legacy-staking-vault.json"],
];

const abisDir = join(frontendDir, "abis");
mkdirSync(abisDir, { recursive: true });

for (const [artifactPath, destName] of SOURCES) {
  const srcPath = join(outDir, artifactPath);

  let raw;
  try {
    raw = readFileSync(srcPath, "utf8");
  } catch {
    console.error(`Missing Foundry artifact: ${srcPath}`);
    console.error("run `forge build` in contracts/ first");
    process.exit(1);
  }

  let artifact;
  try {
    artifact = JSON.parse(raw);
  } catch (err) {
    console.error(`Invalid JSON in ${srcPath}: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(artifact.abi) || artifact.abi.length === 0) {
    console.error(`No ABI array in ${srcPath}`);
    process.exit(1);
  }

  const destPath = join(abisDir, destName);
  writeFileSync(
    destPath,
    `${JSON.stringify(
      { contractName: artifact.contractName, abi: artifact.abi },
      null,
      2,
    )}\n`,
  );
  console.log(`synced ${artifactPath} -> frontend/abis/${destName}`);
}

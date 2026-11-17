import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const metadataPath = resolve(repoRoot, "deployments/legacy-sepolia.json");
const manifestPath = resolve(repoRoot, "subgraph/staking-vault/subgraph.yaml");
const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
const manifest = readFileSync(manifestPath, "utf8");

const network = manifest.match(/^\s+network:\s*([a-z0-9-]+)\s*$/m)?.[1];
const address = manifest.match(/^\s+address:\s*["']?(0x[0-9a-fA-F]{40})["']?\s*$/m)?.[1];
const startBlock = Number(manifest.match(/^\s+startBlock:\s*(\d+)\s*$/m)?.[1]);

const mismatches = [];
if (network !== metadata.network) mismatches.push(`network: manifest=${network}, metadata=${metadata.network}`);
if (address?.toLowerCase() !== metadata.contracts.stakingVault.toLowerCase()) {
  mismatches.push(`stakingVault: manifest=${address}, metadata=${metadata.contracts.stakingVault}`);
}
if (startBlock !== metadata.startBlock) mismatches.push(`startBlock: manifest=${startBlock}, metadata=${metadata.startBlock}`);

if (mismatches.length > 0) {
  console.error("Legacy subgraph manifest does not match deployments/legacy-sepolia.json:");
  for (const mismatch of mismatches) console.error(`- ${mismatch}`);
  process.exit(1);
}

console.log("Legacy subgraph network, address, and start block match deployment metadata.");

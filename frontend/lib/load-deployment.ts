/**
 * Server-side loader for deployments/<network>.json (server-only: node:fs).
 * The relative path is stable because the Next.js server runs with
 * cwd=frontend/. Throws with a reason string the root layout can render as a
 * deployment banner.
 */
import { readFileSync } from "node:fs";
import type { DeploymentMetadata, LegacyDeploymentMetadata } from "@/lib/metadata";
import { validateDeploymentMetadata, validateLegacyDeploymentMetadata } from "@/lib/metadata";

/** Networks the app knows how to serve; NEXT_PUBLIC_DEPLOYMENT picks one. */
const KNOWN_NETWORKS = ["anvil", "sepolia"] as const;
export type NetworkName = (typeof KNOWN_NETWORKS)[number];

export const CHAIN_IDS: Record<NetworkName, number> = {
  anvil: 31337,
  sepolia: 11155111,
};

export interface LoadedDeployment {
  metadata: DeploymentMetadata;
  network: NetworkName;
}

export function loadDeployment(network: string): LoadedDeployment {
  if (!KNOWN_NETWORKS.includes(network as NetworkName)) {
    throw new Error(`deployment metadata: unknown network "${network}"`);
  }
  const name = network as NetworkName;
  const path = `../deployments/${name}.json`;

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`deployment metadata: missing file ${path} (run demo:deploy for ${name})`);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`deployment metadata: ${path} is not valid JSON`);
  }

  return {
    metadata: validateDeploymentMetadata(data, CHAIN_IDS[name]),
    network: name,
  };
}

/** Canonical legacy metadata lives beside the Conviction deployment files. */
export function loadLegacyDeployment(): LegacyDeploymentMetadata {
  let raw: string;
  try { raw = readFileSync("../deployments/legacy-sepolia.json", "utf8"); }
  catch { throw new Error("legacy deployment metadata: missing deployments/legacy-sepolia.json"); }
  let data: unknown;
  try { data = JSON.parse(raw); }
  catch { throw new Error("legacy deployment metadata: file is not valid JSON"); }
  return validateLegacyDeploymentMetadata(data);
}

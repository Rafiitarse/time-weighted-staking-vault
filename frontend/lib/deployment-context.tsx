"use client";

/**
 * Client context holding the deployment metadata loaded server-side by the
 * root layout (loadDeployment → <DeploymentProvider value>). Every surface
 * reads contract addresses and the target chain from here — nothing else may
 * hard-code them.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { DeploymentMetadata } from "@/lib/metadata";

export interface DeploymentContextValue {
  network: string;
  chainId: number;
  metadata: DeploymentMetadata;
}

const DeploymentContext = createContext<DeploymentContextValue | null>(null);

export function DeploymentProvider({
  value,
  children,
}: {
  value: DeploymentContextValue;
  children: ReactNode;
}) {
  return <DeploymentContext.Provider value={value}>{children}</DeploymentContext.Provider>;
}

/**
 * The deployment for the active surface. Throws when the layout failed to
 * load metadata (the layout renders its own deployment-error page instead of
 * mounting the provider, so this guards against use outside the tree).
 */
export function useDeployment(): DeploymentContextValue {
  const value = useContext(DeploymentContext);
  if (!value) throw new Error("useDeployment outside of DeploymentProvider");
  return value;
}

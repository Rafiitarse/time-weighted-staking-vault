"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/lib/toast";

// Wagmi + ConnectKit config, scoped to Sepolia only since that's where
// StakingVault is deployed. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (from
// https://cloud.walletconnect.com) and, optionally, a dedicated Sepolia RPC
// URL in NEXT_PUBLIC_SEPOLIA_RPC_URL for production use.
const config = createConfig(
  getDefaultConfig({
    chains: [sepolia],
    transports: {
      [sepolia.id]: http(
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
      ),
    },
    walletConnectProjectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
    appName: "StakingVault",
    appDescription: "Time-locked ETH staking with tiered rewards",
  }),
);

// ConnectKit theme tokens mirrored from our Tailwind palette so the wallet
// modal doesn't look like a bolted-on default widget.
const connectKitTheme = {
  "--ck-font-family": "inherit",
  "--ck-border-radius": "20px",
  "--ck-overlay-background": "rgba(10, 12, 16, 0.72)",
  "--ck-overlay-backdrop-filter": "blur(8px)",
  "--ck-body-background": "#12161D",
  "--ck-body-background-secondary": "#181D26",
  "--ck-body-background-tertiary": "#0E1116",
  "--ck-body-color": "#E8E6E1",
  "--ck-body-color-muted": "#8B93A1",
  "--ck-body-color-danger": "#E2725B",
  "--ck-body-action-color": "#D4A857",
  "--ck-body-divider": "rgba(255,255,255,0.08)",
  "--ck-primary-button-background": "#D4A857",
  "--ck-primary-button-color": "#12161D",
  "--ck-primary-button-hover-background": "#E0B96B",
  "--ck-secondary-button-background": "rgba(255,255,255,0.05)",
  "--ck-secondary-button-color": "#E8E6E1",
  "--ck-secondary-button-hover-background": "rgba(255,255,255,0.09)",
  "--ck-focus-color": "#D4A857",
} as Record<string, string>;

export function Providers({ children }: { children: ReactNode }) {
  // Created once per browser session, not per render.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider mode="dark" customTheme={connectKitTheme}>
          <ToastProvider>{children}</ToastProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

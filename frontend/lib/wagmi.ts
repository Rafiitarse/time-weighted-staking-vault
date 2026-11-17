/**
 * Wagmi v3 configuration for the Conviction Vault app.
 *
 * Chains: anvil (local demo chain, 31337) and sepolia (public testnet). The
 * Conviction contracts are never on mainnet, so neither surface needs it.
 *
 * WalletConnect (Reown AppKit modal) is only wired when
 * NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set; without it the app runs
 * injected-only and never crashes.
 */
import { createConfig, http, injected } from "wagmi";
import { anvil, sepolia } from "wagmi/chains";
import { createAppKit, type AppKit } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit-common";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

export const convictionChains = [anvil, sepolia] as const;

/** WalletConnect project id from https://cloud.walletconnect.com. Empty → injected only. */
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

/** True when the full AppKit modal is available. */
export const appKitEnabled = walletConnectProjectId.length > 0;

const anvilRpcUrl = process.env.NEXT_PUBLIC_ANVIL_RPC_URL ?? "http://127.0.0.1:8545";
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org";

const appkitMetadata = {
  name: "Conviction Vault",
  description: "Time-weighted ETH staking with a CVR maturity bonus",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://conviction-vault.example",
  icons: [] as string[],
};

/**
 * Wagmi config: Reown's WagmiAdapter config when WalletConnect is configured
 * (the AppKit modal takes over connector management and the adapter appends
 * the WalletConnect connector), otherwise a plain injected-only config.
 * Both paths keep the injected connector and the same transports.
 */
const wagmiAdapter = walletConnectProjectId
  ? new WagmiAdapter({
      networks: [...convictionChains] as AppKitNetwork[],
      projectId: walletConnectProjectId,
      connectors: [injected({ shimDisconnect: true })],
      customRpcUrls: {
        "eip155:31337": [{ url: anvilRpcUrl }],
      },
    })
  : undefined;

export const wagmiConfig =
  wagmiAdapter?.wagmiConfig ??
  createConfig({
    chains: convictionChains,
    connectors: [injected({ shimDisconnect: true })],
    transports: {
      [anvil.id]: http(anvilRpcUrl),
      [sepolia.id]: http(sepoliaRpcUrl),
    },
  });

let appKitModal: AppKit | undefined;

/**
 * Opens the AppKit modal (or a specific view). Lazy: the modal is only
 * constructed on first user interaction, and this is a no-op without a
 * WalletConnect project id — injected-only deployments get a plain connect
 * flow instead.
 */
export function openAppKit(): void {
  if (!walletConnectProjectId) return;
  appKitModal ??= createAppKit({
    adapters: wagmiAdapter ? [wagmiAdapter] : [],
    networks: [...convictionChains] as [AppKitNetwork, ...AppKitNetwork[]],
    projectId: walletConnectProjectId,
    metadata: appkitMetadata,
    themeMode: "dark",
    themeVariables: {
      "--apkt-accent": "#2DD4BF",
      "--apkt-border-radius-master": "6px",
      "--w3m-z-index": 60,
      "--apkt-z-index": 60,
    },
    features: { analytics: false },
  });
  appKitModal.open();
}

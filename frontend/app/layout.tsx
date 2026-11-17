import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { loadDeployment, CHAIN_IDS } from "@/lib/load-deployment";
import { DeploymentProvider } from "@/lib/deployment-context";
import { AppKitProvider } from "@/components/AppKitProvider";
import { VaultEventBridge } from "@/lib/invalidation";
import { Navbar } from "@/components/Navbar";
import { StatusStrip } from "@/components/StatusStrip";
import { ContextualStatusStrip } from "@/components/ContextualStatusStrip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Conviction Vault",
  description:
    "Time-weighted ETH staking: lock ETH, withdraw anytime, receive a one-time maturity bonus on withdrawn principal, paid in CVR.",
};

/**
 * Which deployment the app serves. NEXT_PUBLIC_DEPLOYMENT selects the
 * deployments/<network>.json file; failing to load metadata is a full-page
 * error state, not a silent default.
 */
const NETWORK = process.env.NEXT_PUBLIC_DEPLOYMENT ?? "anvil";

function deploymentError(message: string) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-bg text-ink antialiased">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
          <h1 className="text-lg font-semibold">Deployment metadata unavailable</h1>
          <p className="mt-2 text-sm text-ink-muted">{message}</p>
          <p className="mt-6 text-xs text-ink-faint">
            The frontend refuses to guess contract addresses. Fix the deployment file and
            reload.
          </p>
        </main>
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let loaded;
  try {
    loaded = loadDeployment(NETWORK);
  } catch (error) {
    return deploymentError(
      error instanceof Error ? error.message : "Unknown metadata load failure.",
    );
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-bg text-ink antialiased">
        <AppKitProvider>
          <DeploymentProvider
            value={{
              network: loaded.network,
              chainId: CHAIN_IDS[loaded.network],
              metadata: loaded.metadata,
            }}
          >
            <Navbar />
            <ContextualStatusStrip><StatusStrip /></ContextualStatusStrip>
            <VaultEventBridge />
            <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          </DeploymentProvider>
        </AppKitProvider>
      </body>
    </html>
  );
}

"use client";

/**
 * The one wallet button. With a WalletConnect project id configured it opens
 * the Reown AppKit modal; without one it connects the injected wallet
 * directly — same visual, no crash, no modal.
 */
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { appKitEnabled, openAppKit } from "@/lib/wagmi";
import { cn, formatAddress } from "@/lib/format";

export function ConnectButton({ className }: { className?: string }) {
  return appKitEnabled ? <AppKitConnect className={className} /> : <InjectedConnect className={className} />;
}

const BUTTON = cn(
  "inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:border-accent/40 hover:bg-surface-raised",
);

function AppKitConnect({ className }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const { disconnect, isPending } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          type="button"
          onClick={() => openAppKit()}
          className="num rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-ink hover:border-border-strong"
          title="Open wallet menu"
        >
          {formatAddress(address)}
        </button>
        <button
          type="button"
          onClick={() => void disconnect()}
          className="text-xs text-ink-muted transition-colors hover:text-ink"
        >
          {isPending ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => openAppKit()} className={cn(BUTTON, className)}>
      Connect wallet
    </button>
  );
}

function InjectedConnect({ className }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="num rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-ink">
          {formatAddress(address)}
        </span>
        <button
          type="button"
          onClick={() => void disconnect()}
          className="text-xs text-ink-muted transition-colors hover:text-ink"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const connector = connectors[0];
  return (
    <button
      type="button"
      disabled={isPending || !connector}
      onClick={() => connector && void connect({ connector })}
      className={cn(BUTTON, className)}
    >
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

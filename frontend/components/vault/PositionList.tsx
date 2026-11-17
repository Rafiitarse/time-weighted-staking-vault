"use client";

/**
 * The positions list: discovered from vault Transfer logs (positionDiscovery)
 * and kept fresh by the event bridge. Rendered as one semantic table inside
 * a scrollable region; positions no longer owned by the connected wallet
 * surface as stale rows with a warning banner instead of silently vanishing.
 */
import { useAccount, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useDeployment } from "@/lib/deployment-context";
import { getPublicClient } from "@/lib/contracts";
import { discoverPositions } from "@/lib/positionDiscovery";
import { PositionRow } from "@/components/vault/PositionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { WarningBanner } from "@/components/ui/WarningBanner";
import { StatusPill } from "@/components/ui/StatusPill";

export function PositionList() {
  const { chainId, metadata } = useDeployment();
  const account = useAccount();
  const walletChainId = useChainId();
  const wrongChain = account.isConnected && walletChainId !== chainId;
  const address = account.address;

  const positions = useQuery({
    queryKey: ["positions", chainId, address],
    enabled: !!address && !wrongChain,
    // Discovery is a log scan; keep it explicit and manual-refresh only.
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => {
      const client = getPublicClient(metadata);
      return discoverPositions(client, metadata, address as `0x${string}`);
    },
  });

  if (!address) {
    return (
      <section aria-labelledby="positions-heading">
        <h2 id="positions-heading" className="text-sm font-semibold tracking-tight">
          Your positions
        </h2>
        <EmptyState className="mt-3" title="Connect a wallet to see your positions" />
      </section>
    );
  }

  if (wrongChain) {
    return (
      <section aria-labelledby="positions-heading">
        <h2 id="positions-heading" className="text-sm font-semibold tracking-tight">
          Your positions
        </h2>
        <div className="mt-3">
          <WarningBanner tone="info" title="Wallet on another chain">
            Positions live on {metadata.network} (chain {chainId}). Switch your wallet with
            the banner at the top to load them.
          </WarningBanner>
        </div>
      </section>
    );
  }

  const rows = positions.data ?? [];
  const owned = rows.filter((p) => p.owner.toLowerCase() === address.toLowerCase());
  const stale = rows.filter((p) => p.owner.toLowerCase() !== address.toLowerCase());

  return (
    <section aria-labelledby="positions-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="positions-heading" className="text-sm font-semibold tracking-tight">
          Your positions
        </h2>
        {positions.isFetching ? <StatusPill tone="neutral">Scanning chain…</StatusPill> : null}
      </div>

      {positions.isError ? (
        <div className="mt-3">
          <WarningBanner tone="danger" title="Could not load positions">
            {positions.error instanceof Error ? positions.error.message : "Unknown error."}
          </WarningBanner>
        </div>
      ) : stale.length > 0 ? (
        <div className="mt-3">
          <WarningBanner tone="warning" title="Transferred positions">
            {stale.map((p) => `#${p.tokenId.toString()}`).join(", ")}{" "}
            {stale.length === 1 ? "is" : "are"} no longer owned by this wallet — they were
            transferred away and cannot be withdrawn here.
          </WarningBanner>
        </div>
      ) : null}

      {positions.isLoading ? (
        <EmptyState className="mt-3" title="Scanning the chain for your positions" />
      ) : owned.length === 0 && stale.length === 0 && !positions.isError ? (
        <EmptyState className="mt-3" title="No positions yet — deposit to open one" />
      ) : (
        <div
          role="region"
          aria-label="Positions table"
          tabIndex={0}
          className="positions-region thin-scroll mt-3 rounded-md border border-border bg-surface"
        >
          <table className="positions-table">
            <thead>
              <tr>
                <th scope="col">Position</th>
                <th scope="col">Staked</th>
                <th scope="col">Age</th>
                <th scope="col">Maturity bonus</th>
                <th scope="col">Next tier</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {owned.map((p) => (
                <PositionRow key={p.tokenId.toString()} position={p} stale={false} />
              ))}
              {stale.map((p) => (
                <PositionRow key={p.tokenId.toString()} position={p} stale={true} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

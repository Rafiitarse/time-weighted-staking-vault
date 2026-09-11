"use client";

import { useQuery } from "@tanstack/react-query";
import { request, gql } from "graphql-request";
import { formatEther } from "viem";

const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/1760076/staking-vault/version/latest";


const GLOBAL_STATS_QUERY = gql`
  query GlobalStats {
    protocolStat(id: "global") {
      totalEthStakedAllUsers
      totalRewardsDistributed
    }
  }
`;

interface GlobalStatsResponse {
  protocolStat: {
    totalEthStakedAllUsers: string;
    totalRewardsDistributed: string;
  } | null;
}

function useGlobalStats() {
  return useQuery({
    queryKey: ["subgraph", "global-stats"],
    queryFn: () => request<GlobalStatsResponse>(SUBGRAPH_URL, GLOBAL_STATS_QUERY),
    refetchInterval: 30_000,
    retry: 2,
  });
}

export function Analytics() {
  const { data, isLoading, isError, refetch, isRefetching } = useGlobalStats();

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatPanel
          label="Total ETH Staked Global"
          value={
     
            data?.protocolStat
              ? `${formatEther(BigInt(data.protocolStat.totalEthStakedAllUsers))} ETH`
              : null
          }
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          accent="#D4A857"
        />
        <StatPanel
          label="Total Reward Distributed"
          value={
            data?.protocolStat
              ? `${formatEther(BigInt(data.protocolStat.totalRewardsDistributed))} svRWD`
              : null
          }
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          accent="#4FA8D6"
        />
      </div>
      {!isLoading && !isError && (
        <p className="mt-3 text-right text-[11px] text-[#5B6472]">
          {isRefetching ? "Updating…" : "Automatically updated every 30 seconds"}
        </p>
      )}
    </div>
  );
}

function StatPanel({
  label,
  value,
  isLoading,
  isError,
  onRetry,
  accent,
}: {
  label: string;
  value: string | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-2xl">
      <div
        className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full blur-3xl"
        style={{ backgroundColor: `${accent}14` }}
      />
      <p className="relative text-xs font-medium text-[#8B93A1]">{label}</p>

      {isLoading ? (
        <div className="relative mt-3 h-9 w-40 animate-pulse rounded-lg bg-white/[0.06]" />
      ) : isError ? (
        <div className="relative mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[#E2725B]">Failed to load data.</p>
          <button
            onClick={() => onRetry()}
            className="shrink-0 text-xs font-medium text-[#D4A857] hover:text-[#E0B96B]"
          >
            Try again
          </button>
        </div>
      ) : (
        <p className="relative mt-2 text-3xl font-light tracking-tight text-[#E8E6E1]">
          {value}
        </p>
      )}
    </div>
  );
}
"use client";

import { useMemo, useState } from "react";
import { formatEther, parseEther, type Address } from "viem";
import { useAccount, useChainId, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sepolia } from "wagmi/chains";
import { usePublicClient } from "wagmi";
import legacyAbi from "@/abis/legacy-staking-vault.json";
import type { LegacyDeploymentMetadata } from "@/lib/metadata";
import { TxButton } from "@/components/ui/TxButton";

const abi = legacyAbi.abi as readonly unknown[];
const address = (value: string) => value as Address;
const explorer = "https://sepolia.etherscan.io";

export function LegacyDashboard({ metadata }: { metadata: LegacyDeploymentMetadata }) {
  const [amount, setAmount] = useState("");
  const account = useAccount();
  const walletChain = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: sepolia.id });
  const queryClient = useQueryClient();
  const vault = address(metadata.contracts.stakingVault);
  const paused = useReadContract({ address: vault, abi, functionName: "paused", chainId: sepolia.id });
  const receipt = useReadContract({ address: vault, abi, functionName: "receiptToken", chainId: sepolia.id });
  const reward = useReadContract({ address: vault, abi, functionName: "rewardToken", chainId: sepolia.id });
  const lotsQuery = useQuery({
    queryKey: ["legacy-lots", metadata.chainId, account.address],
    enabled: Boolean(account.address) && Boolean(client),
    queryFn: async () => {
      if (!account.address || !client) return [];
      const data = await client.readContract({ address: vault, abi, functionName: "getUserLots", args: [account.address] }) as Array<{ amount: bigint; timestamp: bigint }>;
      return data.map((lot, lotId) => ({ ...lot, lotId }));
    },
  });
  const parsedAmount = useMemo(() => {
    try { return amount.trim() ? parseEther(amount) : 0n; } catch { return 0n; }
  }, [amount]);
  const wrongChain = account.isConnected && walletChain !== sepolia.id;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["legacy-lots", metadata.chainId, account.address] });

  async function transact(functionName: "deposit" | "withdrawFromLot", args?: readonly unknown[], value?: bigint) {
    return writeContractAsync({ address: vault, abi, functionName, args, value, chainId: sepolia.id } as never);
  }

  return <div className="space-y-6">
    <section className="grid gap-4 rounded-xl border border-border bg-surface p-5 md:grid-cols-[1fr_auto] md:items-center">
      <div><h2 className="text-sm font-semibold">Legacy Sepolia vault</h2><p className="mt-1 text-xs text-ink-muted">This is the original stETH / RWD system. It is separate from Conviction Vault and has no position migration.</p><p className="mt-2 break-all font-mono text-[11px] text-ink-faint">{vault}</p></div>
      <a className="text-sm text-accent hover:underline" href={`${explorer}/address/${vault}`} target="_blank" rel="noreferrer">View on Etherscan ↗</a>
    </section>
    <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Deposit ETH</h2><span className={`text-xs ${paused.isError ? "text-warning" : paused.data ? "text-danger" : "text-ink-muted"}`}>{paused.isError ? "Status unavailable" : paused.data ? "Deposits paused" : "Sepolia · legacy"}</span></div>
        <p className="mt-2 text-sm text-ink-muted">Legacy contract issues its old stETH receipt and RWD reward. Your principal remains subject to this legacy contract’s rules.</p>
        {!account.isConnected ? <p className="mt-4 text-sm text-warning">Connect a wallet to continue.</p> : wrongChain ? <button onClick={() => switchChain({ chainId: sepolia.id })} disabled={switching} className="mt-4 rounded-md bg-accent px-4 py-2 text-sm text-accent-ink">{switching ? "Switching…" : "Switch wallet to Sepolia"}</button> : null}
        <label className="mt-5 block text-xs text-ink-muted" htmlFor="legacy-amount">Amount (ETH)</label>
        <input id="legacy-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-bg px-3 text-sm" placeholder="0.0" />
        <TxButton className="mt-3" label="Deposit ETH" system="legacy" explorerBaseUrl={explorer} validate={() => !account.address ? "Connect a wallet first." : wrongChain ? "Switch the connected wallet to Sepolia." : paused.isError ? "Could not verify whether deposits are paused. Try again later." : paused.data ? "The legacy vault has paused new deposits." : !receipt.data || !reward.data ? "Legacy token configuration could not be verified." : parsedAmount <= 0n ? "Enter an amount greater than zero." : null} send={() => transact("deposit", [], parsedAmount)} onConfirmed={refresh} />
        {paused.isError || receipt.isError || reward.isError ? <p className="mt-3 text-xs text-warning">A legacy contract read failed. Deposit is disabled until chain status and token configuration can be verified.</p> : null}
      </div>
      <div className="rounded-xl border border-border bg-surface p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Your deposit lots</h2>{lotsQuery.data ? <span className="text-xs text-ink-faint">{lotsQuery.data.length} lots</span> : null}</div>
        {!account.address ? <p className="mt-5 text-sm text-ink-muted">Connect the wallet that owns the legacy lots.</p> : lotsQuery.isLoading ? <p className="mt-5 text-sm text-ink-muted">Loading Sepolia lots…</p> : lotsQuery.isError ? <p className="mt-5 text-sm text-danger">Could not load legacy lots. Check your RPC connection and retry.</p> : !lotsQuery.data?.length ? <p className="mt-5 text-sm text-ink-muted">No legacy lots found for this wallet.</p> : <div className="mt-4 space-y-3">{lotsQuery.data.map(lot => <LegacyLotCard key={lot.lotId} lot={lot} send={transact} refresh={refresh} disabled={wrongChain} />)}</div>}
      </div>
    </section>
    <p className="text-xs leading-5 text-ink-faint">Legacy contract tokens: receipt {typeof receipt.data === "string" ? receipt.data : "unavailable"} · reward {typeof reward.data === "string" ? reward.data : "unavailable"}. Transactions execute on Sepolia only.</p>
  </div>;
}

function LegacyLotCard({ lot, send, refresh, disabled }: { lot: { lotId: number; amount: bigint; timestamp: bigint }; send: (fn: "withdrawFromLot", args?: readonly unknown[]) => Promise<`0x${string}`>; refresh: () => void; disabled: boolean }) {
  const [withdraw, setWithdraw] = useState(formatEther(lot.amount));
  const parsed = (() => { try { return parseEther(withdraw); } catch { return 0n; } })();
  return <article className="grid gap-3 rounded-lg border border-border bg-bg p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-sm font-medium">Lot {lot.lotId + 1} <span className="num ml-2 text-ink-muted">{formatEther(lot.amount)} ETH</span></p><p className="mt-1 text-xs text-ink-faint">Deposited {new Date(Number(lot.timestamp) * 1000).toLocaleDateString()}</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs text-ink-muted">Withdraw ETH<input aria-label={`Withdraw amount from lot ${lot.lotId + 1}`} inputMode="decimal" value={withdraw} onChange={e => setWithdraw(e.target.value)} className="mt-1 h-9 w-28 rounded-md border border-border bg-surface px-2 text-sm" /></label><TxButton label="Withdraw" system="legacy" explorerBaseUrl={explorer} validate={() => disabled ? "Switch the connected wallet to Sepolia." : parsed <= 0n || parsed > lot.amount ? "Enter an amount above zero and no greater than this lot." : null} send={() => send("withdrawFromLot", [BigInt(lot.lotId), parsed])} onConfirmed={refresh} /></div></article>;
}

import { loadDeployment } from "@/lib/load-deployment";

export default function AdminPage() {
  const network = process.env.NEXT_PUBLIC_DEPLOYMENT ?? "anvil";
  let deployment;
  try { deployment = loadDeployment(network); }
  catch (error) {
    return <section><h1 className="text-lg font-semibold">Operator information</h1><p className="mt-2 text-sm text-danger">{error instanceof Error ? error.message : "Deployment metadata unavailable."}</p></section>;
  }
  const { metadata } = deployment;
  const rows = [
    ["Conviction Vault", metadata.contracts.convictionVault],
    ["CVR token", metadata.contracts.convictionRewards],
    ["Reward Distributor", metadata.contracts.rewardDistributor],
    ["Safe admin", metadata.safeAdmin],
    ["Guardian", metadata.guardian],
    ["Indexer start block", String(metadata.startBlock)],
  ];
  return <div className="space-y-6">
    <section><h1 className="text-lg font-semibold tracking-tight">Operator information</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Read-only deployment reference for {metadata.network} (chain {metadata.chainId}). This page does not send admin or guardian transactions.</p></section>
    <section className="overflow-hidden rounded-xl border border-border bg-surface"><dl>{rows.map(([label, value]) => <div key={label} className="grid gap-1 border-b border-border p-4 last:border-0 sm:grid-cols-[200px_1fr] sm:items-center"><dt className="text-xs text-ink-faint">{label}</dt><dd className="break-all font-mono text-xs text-ink-muted">{value}</dd></div>)}</dl></section>
    <p className="rounded-md border border-warning/30 bg-warning/5 p-4 text-sm leading-6 text-ink-muted">Admin handover uses the contract’s 48-hour delay. Deposits can be paused by the guardian; pausing does not disable withdrawals. Use the configured Safe and independently verify every transaction. This app does not create Safe proposals.</p>
  </div>;
}

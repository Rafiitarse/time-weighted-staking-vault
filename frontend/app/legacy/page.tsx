import { LegacyDashboard } from "@/components/LegacyDashboard";
import { loadLegacyDeployment } from "@/lib/load-deployment";

export default function LegacyPage() {
  let metadata;
  try { metadata = loadLegacyDeployment(); }
  catch (error) { return <section><h1 className="text-lg font-semibold">Legacy staking</h1><p className="mt-2 text-sm text-danger">{error instanceof Error ? error.message : "Legacy deployment metadata unavailable."}</p></section>; }
  return <div className="space-y-6"><section><h1 className="text-lg font-semibold tracking-tight">Legacy staking</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Read and manage existing lots on Sepolia. The legacy contract is separate from Conviction Vault; positions are not migrated.</p></section><LegacyDashboard metadata={metadata} /></div>;
}

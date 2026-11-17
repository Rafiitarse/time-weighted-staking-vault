"use client";

/**
 * Truncated contract/address chip in the mono face. Links to the chain
 * explorer only when one exists (Anvil has none — chip only).
 */
import { cn, formatAddress } from "@/lib/format";
import { ExternalLinkIcon } from "@/components/ui/icons";

export function AddressChip({
  address,
  explorerBaseUrl,
  className,
}: {
  address: string;
  explorerBaseUrl?: string;
  className?: string;
}) {
  const label = formatAddress(address);
  if (explorerBaseUrl) {
    return (
      <a
        href={`${explorerBaseUrl}/address/${address}`}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "num inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-1.5 py-px text-xs text-ink-muted transition-colors hover:border-border-strong hover:text-ink",
          className,
        )}
        title={address}
      >
        {label}
        <ExternalLinkIcon size={12} />
      </a>
    );
  }
  return (
    <span
      className={cn(
        "num inline-block rounded-sm border border-border bg-surface px-1.5 py-px text-xs text-ink-muted",
        className,
      )}
      title={address}
    >
      {label}
    </span>
  );
}

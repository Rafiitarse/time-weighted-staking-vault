"use client";

/**
 * The single transaction button lifecycle: idle → signing (wallet open) →
 * pending (hash on chain) → confirmed / failed. The phase is derived, not
 * stored transitionally: failure state and the submitted hash + receipt
 * status fully determine it. Hash link + explicit failure text from
 * lib/errors.ts — never a generic "something went wrong".
 *
 * The caller owns the contract specifics: `send` performs the write and
 * resolves with the hash once the wallet accepts. TxButton waits for the
 * receipt itself and reports the outcome via `onConfirmed` from an effect
 * (external-system notification, no state transitions).
 */
import { useEffect, useRef, useState } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { parseContractError, type ParsedError } from "@/lib/errors";
import { cn } from "@/lib/format";
import { ExternalLinkIcon } from "@/components/ui/icons";

export interface TxButtonProps {
  /** Verb + object, e.g. "Deposit 1 ETH", "Withdraw full position". */
  label: string;
  /** Performs the write; resolves with the hash after the wallet confirms. */
  send: () => Promise<`0x${string}`>;
  /** Error vocabulary for this contract system. */
  system: "conviction" | "legacy";
  /**
   * Preflight, run before the wallet opens. Returns a human message when the
   * form data is invalid (shown in the failure slot), or null to proceed.
   */
  validate?: () => string | null;
  /** "submit" lets the button live inside a <form> as its default button. */
  type?: "button" | "submit";
  /** Called with the hash once the receipt confirms (or shows skipped info). */
  onConfirmed?: (hash: `0x${string}`, receipt: unknown) => void;
  /** Explorer base URL for the hash link (absent on Anvil). */
  explorerBaseUrl?: string;
  className?: string;
}

export function TxButton({
  label,
  send,
  system,
  validate,
  type = "button",
  onConfirmed,
  explorerBaseUrl,
  className,
}: TxButtonProps) {
  const [signing, setSigning] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [failure, setFailure] = useState<ParsedError | null>(null);
  const onConfirmedRef = useRef(onConfirmed);

  // Keep the ref current outside render (effect) so the confirmation
  // effect below never fires with a stale callback.
  useEffect(() => {
    onConfirmedRef.current = onConfirmed;
  }, [onConfirmed]);

  const receipt = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
    query: { enabled: hash !== null },
  });

  // Derived phase — no transition state to desynchronize.
  const settled = receipt.status === "success" || receipt.status === "error";
  const phase =
    failure ? "failed"
    : signing ? "signing"
    : hash === null ? "idle"
    : receipt.status === "success"
      ? "confirmed"
      : receipt.status === "error"
        ? "failed"
        : "pending";

  const confirmed = hash !== null && receipt.status === "success";

  // Notify the caller from an effect: the receipt arriving is an external
  // event; this does not update local state.
  useEffect(() => {
    if (confirmed && hash && receipt.data) {
      onConfirmedRef.current?.(hash, receipt.data);
    }
  }, [confirmed, hash, receipt.data]);

  async function run() {
    const invalid = validate?.() ?? null;
    if (invalid !== null) {
      setHash(null);
      setFailure({ title: "Check the form", detail: invalid });
      return;
    }
    setSigning(true);
    setFailure(null);
    setHash(null);
    try {
      const txHash = await send();
      setHash(txHash);
      setSigning(false);
    } catch (error) {
      setSigning(false);
      setFailure(
        parseContractError(error, system) ?? {
          title: "Transaction not sent",
          detail: "The wallet rejected or failed the request. Nothing changed.",
        },
      );
    }
  }

  const busy = signing || (hash !== null && !settled);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <button
        type={type}
        onClick={() => void run()}
        disabled={busy}
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors",
          busy
            ? "cursor-wait bg-surface-raised text-ink-muted"
            : "bg-accent text-accent-ink hover:bg-accent-strong",
        )}
      >
        {phase === "signing"
          ? "Confirm in wallet…"
          : phase === "pending"
            ? "Waiting for confirmation…"
            : label}
      </button>

      {hash && explorerBaseUrl ? (
        <a
          href={`${explorerBaseUrl}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="num inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
        >
          {hash.slice(0, 10)}…{hash.slice(-6)} <ExternalLinkIcon size={12} />
        </a>
      ) : null}

      {failure ? (
        <p className="text-xs text-danger">
          <span className="font-medium">{failure.title}</span>
          {failure.detail ? ` — ${failure.detail}` : ""}
        </p>
      ) : null}

      {receipt.status === "error" && !failure ? (
        <p className="text-xs text-danger">
          <span className="font-medium">Transaction reverted on chain</span>
          {" — "}The transaction was mined but reverted. Nothing changed; no funds moved.
        </p>
      ) : null}
    </div>
  );
}

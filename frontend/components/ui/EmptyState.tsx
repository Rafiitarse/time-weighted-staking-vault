/**
 * Empty list state: a plain sentence naming what is missing and what to do —
 * no illustration, no spinner.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function EmptyState({
  title,
  children,
  className,
}: {
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-dashed border-border px-4 py-10 text-center", className)}>
      <p className="text-sm font-medium text-ink">{title}</p>
      {children ? <p className="mt-1 text-sm text-ink-muted">{children}</p> : null}
    </div>
  );
}

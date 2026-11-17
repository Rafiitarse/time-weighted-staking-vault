"use client";

import { usePathname } from "next/navigation";

export function ContextualStatusStrip({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/legacy") ? null : children;
}

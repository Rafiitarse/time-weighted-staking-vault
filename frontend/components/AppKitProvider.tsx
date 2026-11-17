"use client";

/**
 * Client provider tree: wagmi (shared config from lib/wagmi.ts) → TanStack
 * Query (wagmi v3 hooks are query-backed) → toasts → app.
 */
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/lib/toast";
import { wagmiConfig } from "@/lib/wagmi";

export function AppKitProvider({ children }: { children: ReactNode }) {
  // Created once per browser session, not per render.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

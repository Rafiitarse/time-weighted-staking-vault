"use client";

import { ConnectKitButton } from "connectkit";
import { formatAddress } from "@/lib/utils";

function VaultMark() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="32"
        height="32"
        rx="9"
        stroke="#D4A857"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <circle cx="17" cy="17" r="10.5" stroke="#D4A857" strokeOpacity="0.5" strokeWidth="1.4" />
      <circle cx="17" cy="17" r="6.5" stroke="#D4A857" strokeOpacity="0.8" strokeWidth="1.4" />
      <circle cx="17" cy="17" r="2.4" fill="#D4A857" />
    </svg>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0E1116]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <VaultMark />
          <div className="flex flex-col leading-none">
            <span className="text-[17px] font-semibold tracking-tight text-[#E8E6E1]">
              StakingVault
            </span>
            <span className="mt-1 text-[11px] text-[#8B93A1]">Sepolia Testnet</span>
          </div>
        </div>

        <ConnectKitButton.Custom>
          {({ isConnected, isConnecting, show, address, ensName }) => (
            <button
              onClick={show}
              className="group relative overflow-hidden rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-[#E8E6E1] transition-colors hover:border-[#D4A857]/40 hover:bg-white/[0.07]"
            >
              <span className="flex items-center gap-2">
                {isConnected && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#6FA287]" />
                )}
                {isConnecting
                  ? "Connecting…"
                  : isConnected
                    ? (ensName ?? formatAddress(address ?? ""))
                    : "Connect Wallet"}
              </span>
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>
    </header>
  );
}

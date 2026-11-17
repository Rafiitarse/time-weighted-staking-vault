/**
 * Drawn inline icons — one consistent stroke (1.5px, round caps, 16px grid).
 * No emoji or unicode glyphs anywhere in the UI.
 */
import type { ReactNode } from "react";

function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CopyIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" />
    </Svg>
  );
}

export function CheckIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M3 8.5L6.5 12L13 4.5" />
    </Svg>
  );
}

export function ExternalLinkIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M6.5 2.5H3.5A1 1 0 0 0 2.5 3.5v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3" />
      <path d="M9.5 2.5h4v4" />
      <path d="M13.5 2.5L8 8" />
    </Svg>
  );
}

export function AlertIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M8 1.5L15 14H1L8 1.5Z" />
      <path d="M8 6.5V9.5" />
      <circle cx="8" cy="11.75" r="0.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function InfoIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 7.25V11" />
      <circle cx="8" cy="5" r="0.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ArrowIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <Svg size={size}>
      <path className={className} d="M2 8H13.5" />
      <path d="M9.5 3.5L14 8L9.5 12.5" />
    </Svg>
  );
}

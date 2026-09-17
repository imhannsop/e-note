"use client";

import { useEffect, useState } from "react";

export function Icon({
  d,
  className = "size-5",
}: {
  d: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

// Height of the on-screen keyboard, so bottom bars can sit on top of it
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

// Ruled lines match the textarea's 32px line height
export const RULED = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent 0 31px, color-mix(in srgb, var(--foreground) 12%, transparent) 31px 32px)",
  backgroundPosition: "0 16px",
  backgroundAttachment: "local",
};

// Numbered section label, echoing the home tiles
export function Step({
  n,
  label,
  optional,
}: {
  n: number;
  label: string;
  optional?: boolean;
}) {
  return (
    <h2 className="flex items-baseline gap-2">
      <span className="text-xs font-medium tabular-nums text-[var(--gray)]">
        0{n}
      </span>
      <span className="text-sm font-semibold tracking-tight">{label}</span>
      {optional && (
        <span className="text-[10px] font-medium tracking-[0.2em] text-[var(--gray)] uppercase">
          optional
        </span>
      )}
    </h2>
  );
}

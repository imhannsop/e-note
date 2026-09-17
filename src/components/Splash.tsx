"use client";

import { useEffect, useState } from "react";

export function InkStroke({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 40"
      className={`text-foreground ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path
        pathLength={1}
        className="ink-stroke"
        d="M6 28c8-14 14-20 18-18s-6 18-2 18 10-16 14-16-2 16 2 16 8-12 12-14 4 12 8 12 10-18 16-18-6 18 0 18 12-10 18-12 8 8 14 6"
      />
      <circle cx="112" cy="26" r="2.5" fill="currentColor" stroke="none" className="ink-drop" />
    </svg>
  );
}

export default function Splash() {
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    // Hold the splash for a moment so it does not flicker on a fast load
    const minTimer = new Promise((r) => setTimeout(r, 1500));
    const loaded = new Promise((r) => {
      if (document.readyState === "complete") r(null);
      else window.addEventListener("load", () => r(null), { once: true });
    });

    Promise.all([minTimer, loaded]).then(() => {
      setPhase("fading");
      fadeTimer = setTimeout(() => setPhase("gone"), 400);
    });

    return () => clearTimeout(fadeTimer);
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-400 motion-reduce:transition-none ${
        phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <InkStroke className="w-40 sm:w-52" />
    </div>
  );
}

// Short splash shown over a screen while it opens underneath.
export function ScreenSplash({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setFading(true), 600);
    const done = setTimeout(onDone, 800);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`ink-fast fixed inset-0 z-[60] flex items-center justify-center bg-background transition-opacity duration-200 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <InkStroke className="w-32 sm:w-40" />
    </div>
  );
}

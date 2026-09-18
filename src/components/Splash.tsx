"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLoadState } from "@/components/loading";

export function InkStroke({
  className = "",
  progress,
}: {
  className?: string;
  progress?: number;
}) {
  const tracked = progress !== undefined;
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
        className={tracked ? "ink-progress" : "ink-stroke"}
        style={tracked ? { strokeDashoffset: 1 - progress } : undefined}
        d="M6 28c8-14 14-20 18-18s-6 18-2 18 10-16 14-16-2 16 2 16 8-12 12-14 4 12 8 12 10-18 16-18-6 18 0 18 12-10 18-12 8 8 14 6"
      />
      <circle
        cx="112"
        cy="26"
        r="2.5"
        fill="currentColor"
        stroke="none"
        className={tracked ? (progress >= 1 ? "ink-drop" : "opacity-0") : "ink-drop"}
      />
    </svg>
  );
}

function useLoadProgress(minMs: number, extraReady = true) {
  const { pending, finished } = useLoadState();
  const [start] = useState(finished);
  const [minPassed, setMinPassed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const min = setTimeout(() => setMinPassed(true), minMs);
    const max = setTimeout(() => setTimedOut(true), 10_000);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, [minMs]);

  const doneSince = finished - start;
  const idle = pending === 0 && extraReady;
  const done = timedOut || (minPassed && idle);
  const target = done
    ? 1
    : idle
      ? 0.9
      : pending
        ? 0.1 + 0.8 * (doneSince / (doneSince + pending))
        : 0.5; 
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const tick = () =>
      setProgress((shown) => {
        const goal = targetRef.current;
        if (goal >= 1) return 1;
        const creep = shown + (Math.min(goal + 0.1, 0.95) - shown) * 0.08;
        return Math.max(shown, goal, creep);
      });
    const first = requestAnimationFrame(tick);
    const timer = setInterval(tick, 100);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(timer);
    };
  }, []);

  return { progress, done };
}

function subscribeLoad(onChange: () => void) {
  window.addEventListener("load", onChange);
  return () => window.removeEventListener("load", onChange);
}

export default function Splash() {
  const loaded = useSyncExternalStore(
    subscribeLoad,
    () => document.readyState === "complete",
    () => false,
  );
  const [gone, setGone] = useState(false);

  const { progress, done } = useLoadProgress(1500, loaded);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 400);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;

  return (
    <div
      role="status"
      aria-label="Loading"
      aria-busy={!done}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-400 motion-reduce:transition-none ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <InkStroke className="w-40 sm:w-52" progress={progress} />
    </div>
  );
}

export function ScreenSplash({
  onDone,
  children,
}: {
  onDone: () => void;
  children?: ReactNode;
}) {
  const { progress, done } = useLoadProgress(children ? 900 : 350);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onDone, 450);
    return () => clearTimeout(t);
  }, [done, onDone]);

  return (
    <div
      role="status"
      aria-label="Loading"
      aria-busy={!done}
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-background transition-opacity duration-200 delay-250 ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {children}
      <InkStroke className="w-32 sm:w-40" progress={progress} />
    </div>
  );
}

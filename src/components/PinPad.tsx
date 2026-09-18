"use client";

import { useEffect, useState } from "react";
import { createPin, pinStatus, signIn } from "@/app/actions";
import { Avatar, type Profile } from "@/components/profiles";
import { Icon } from "@/components/ui";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
const LETTERS: Record<string, string> = {
  "2": "abc",
  "3": "def",
  "4": "ghi",
  "5": "jkl",
  "6": "mno",
  "7": "pqrs",
  "8": "tuv",
  "9": "wxyz",
};

const RED = "text-[#c8321f] dark:text-[#f06a55]";

const ICONS = {
  back: "M15 18l-6-6 6-6",
  del: "M9 5h11v14H9l-6-7zM12 9l5 6M17 9l-5 6",
};

export default function PinPad({
  profile,
  onBack,
  onSuccess,
}: {
  profile: Profile;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(0);
  const [mode, setMode] = useState<"loading" | "enter" | "create" | "confirm">(
    "loading",
  );
  const [first, setFirst] = useState("");

  useEffect(() => {
    pinStatus(profile.id).then(
      (s) => setMode(s.hasPin ? "enter" : "create"),
      () => {
        setMode("enter");
        setError("Couldn't reach the server");
      },
    );
  }, [profile.id]);

  function reject(message: string) {
    setError(message);
    setPin("");
    setShake((n) => n + 1);
  }

  async function submit(code: string) {
    if (mode === "create") {
      setFirst(code);
      setPin("");
      setMode("confirm");
      return;
    }
    if (mode === "confirm" && code !== first) {
      setMode("create");
      setFirst("");
      return reject("Didn't match. Start again.");
    }
    setChecking(true);
    const res = await (
      mode === "confirm"
        ? createPin(profile.id, code)
        : signIn(profile.id, code)
    ).catch(() => ({ ok: false as const, error: "Couldn't reach the server" }));
    setChecking(false);
    if (res.ok) return onSuccess();
    if (mode === "confirm") {
      setFirst("");
      const status = await pinStatus(profile.id).catch(() => ({
        hasPin: false,
      }));
      setMode(status.hasPin ? "enter" : "create");
    }
    reject(res.error);
  }

  function press(key: string) {
    if (checking || mode === "loading") return;
    if (key === "del") return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    setError(null);
    if (next.length === 4) submit(next);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
      else if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const setup = mode === "create" || mode === "confirm";
  const status = checking
    ? "Checking…"
    : (error ??
      {
        loading: "One moment…",
        enter: "Enter your PIN",
        create: "Pick a secret PIN",
        confirm: "Once more to confirm",
      }[mode]);

  return (
    <section className="enter mx-auto flex w-full max-w-sm flex-1 flex-col gap-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 flex h-9 items-center gap-1 rounded-full border border-foreground/20 pr-3 pl-2 text-xs font-medium transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.back} className="size-4" />
          Switch
        </button>
        {setup && (
          <span
            className="flex items-center gap-1.5"
            aria-label={`Step ${mode === "create" ? 1 : 2} of 2`}
          >
            {[1, 2].map((n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  (mode === "create" ? 1 : 2) >= n
                    ? "w-6 bg-foreground"
                    : "w-3 bg-foreground/20"
                }`}
              />
            ))}
          </span>
        )}
      </div>

      <header className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-medium tracking-[0.3em] text-foreground/40 uppercase">
            {mode === "loading"
              ? "\u00a0"
              : setup
                ? "First time here"
                : "Welcome back"}
          </span>
          <h1 className="truncate text-5xl leading-none font-semibold tracking-tighter">
            {setup ? "Hello" : "Hi"}, {profile.name}
            <span className="text-foreground/30">.</span>
          </h1>
        </div>
        <Avatar
          profile={profile}
          className="size-20 shrink-0 rotate-3 rounded-3xl text-3xl ring-[1.5px] ring-foreground ring-offset-4 ring-offset-background"
        />
      </header>

      <div className="flex flex-col gap-3">
        <div
          key={shake}
          className={`grid grid-cols-4 gap-3 ${shake ? "pin-shake" : ""}`}
          role="status"
          aria-label={`${pin.length} of 4 digits entered`}
        >
          {[0, 1, 2, 3].map((i) => {
            const filled = i < pin.length;
            const active = i === pin.length && !checking && mode !== "loading";
            return (
              <span
                key={i}
                className={`relative grid aspect-square place-items-center rounded-2xl border-[1.5px] transition-all duration-200 ${
                  error
                    ? "border-[#c8321f] dark:border-[#f06a55]"
                    : "border-foreground"
                } ${filled ? "ink-solid" : active ? "ink-fill ink-dots -translate-y-0.5" : "border-foreground/25"} ${
                  checking ? "animate-pulse" : ""
                }`}
              >
                {filled && (
                  <span className="check-pop size-3 rounded-full bg-background" />
                )}
                {active && (
                  <span className="absolute bottom-2.5 h-0.5 w-4 animate-pulse rounded-full bg-foreground" />
                )}
              </span>
            );
          })}
        </div>
        <p
          className={`flex h-5 items-center justify-between text-xs font-medium ${error ? RED : "text-foreground/50"}`}
          aria-live="polite"
        >
          <span
            className={`truncate ${error ? "" : "tracking-[0.2em] uppercase"}`}
          >
            {status}
          </span>
          {setup && !error && (
            <span className="tabular-nums tracking-[0.2em]">
              {mode === "create" ? "1" : "2"} / 2
            </span>
          )}
        </p>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2.5 pb-2">
        {KEYS.map((k) =>
          k === "" ? (
            <span key="blank" />
          ) : k === "del" ? (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              disabled={checking || mode === "loading" || pin.length === 0}
              aria-label="Delete"
              className="grid h-[4.25rem] place-items-center rounded-2xl transition-all duration-150 active:scale-[0.94] disabled:opacity-25"
            >
              <Icon d={ICONS.del} className="size-6" />
            </button>
          ) : (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              disabled={checking || mode === "loading"}
              aria-label={k}
              className="ink-fill group flex h-[4.25rem] flex-col items-center justify-center rounded-2xl transition-all duration-150 hover:bg-foreground/5 active:scale-[0.94] active:bg-foreground active:text-background disabled:opacity-40"
            >
              <span className="text-[1.7rem] leading-none font-semibold tabular-nums">
                {k}
              </span>
              <span className="mt-1 h-2.5 text-[9px] leading-none font-medium tracking-[0.2em] uppercase opacity-40">
                {LETTERS[k] ?? ""}
              </span>
            </button>
          ),
        )}
      </div>
    </section>
  );
}

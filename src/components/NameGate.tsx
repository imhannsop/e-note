"use client";

import { useState, useSyncExternalStore } from "react";

const KEY = "enote:name";
// Main tile layout for the home screen
const ACTIONS = [
  { icon: "✍️", label: "Write a post", hint: "Share what's on your mind", tile: "col-span-2 ink-solid" },
  { icon: "✅", label: "To-do list", hint: "Plan your day", tile: "ink-dots" },
  { icon: "🗓️", label: "Weekly Planner", hint: "Plan your week", tile: "ink-lines" },
  { icon: "🖼️", label: "View Gallery", hint: "Browse your posts", tile: "col-span-2 ink-grid" },
];

const listeners = new Set<() => void>();

function readName() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem(KEY, name);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export default function NameGate() {
  // Keep the server render empty until we know the saved name
  const stored = useSyncExternalStore(subscribe, readName, () => null);
  const [draft, setDraft] = useState("");
  const [justNamed, setJustNamed] = useState(false);

  if (stored === null) return null;

  if (stored) {
    const today = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    return (
      <section
        // Skip the entrance delay right after naming
        style={justNamed ? { animationDelay: "0s" } : undefined}
        className="rise flex w-full flex-1 flex-col gap-6 sm:gap-8"
      >
        <header className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-[0.3em] text-foreground/40 uppercase">
            {today}
          </span>
          <h1 className="text-6xl leading-[0.95] font-semibold tracking-tighter break-words sm:text-7xl">
            Hello,
            <br />
            <span className="text-7xl">{stored}</span> !
          </h1>
          <p className="mt-2 text-2xl text-foreground/50 sm:text-xl">
            What will you do today?
          </p>
        </header>

        <div className="grid min-h-96 flex-1 grid-cols-2 grid-rows-[1.6fr_1fr_0.8fr] gap-3">
          {ACTIONS.map(({ icon, label, hint, tile }, i) => (
            <button
              key={label}
              type="button"
              className={`group relative flex flex-col justify-end overflow-hidden ink-fill rounded-3xl p-5 text-left transition-transform duration-200 active:scale-[0.97] ${tile}`}
            >
              <span
                className="absolute -top-3 -right-3 text-8xl opacity-20 grayscale transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 sm:text-9xl"
                aria-hidden
              >
                {icon}
              </span>
              <span className="absolute top-4 left-5 text-xs font-medium tabular-nums opacity-50">
                0{i + 1}
              </span>
              <span className={`font-semibold tracking-tight ${i === 0 ? "text-3xl sm:text-4xl" : "text-lg sm:text-xl"}`}>
                {label}
              </span>
              <span className="text-sm opacity-60">{hint}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const name = draft.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name) return;
        setJustNamed(true);
        saveName(name);
      }}
      className="paper relative m-auto flex w-full max-w-md flex-col gap-10 rounded-3xl border border-foreground/10 px-6 pt-8 pb-6 sm:px-10"
    >
      <span className="absolute inset-y-0 left-4 w-px bg-foreground/25 sm:left-6" aria-hidden />

      <div className="flex flex-col gap-1 pl-2">
        <span className="text-xs font-medium tracking-[0.3em] text-foreground/40 uppercase">
          Page one
        </span>
        <label htmlFor="name" className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          This notebook
          <br />
          belongs to…
        </label>
      </div>

      <div className="flex items-end gap-3 pl-2">
        <div className="relative flex-1">
          <input
            id="name"
            autoFocus
            autoComplete="given-name"
            enterKeyHint="done"
            spellCheck={false}
            maxLength={40}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="your name"
            className="h-14 w-full bg-transparent text-3xl italic outline-none placeholder:text-foreground/20 sm:text-4xl"
          />
          <span className="absolute bottom-1 left-0 h-px w-full bg-foreground/15" aria-hidden />
          <span
            className="absolute bottom-1 left-0 h-0.5 rounded-full bg-foreground transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(draft.length * 9, 100)}%` }}
            aria-hidden
          />
        </div>

        <button
          type="submit"
          disabled={!name}
          aria-label="Continue"
          className="mb-2 grid size-12 shrink-0 place-items-center rounded-[50%_50%_50%_12%] bg-foreground text-background transition-all duration-300 ease-out disabled:scale-0 disabled:opacity-0"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <p className="pl-2 text-sm text-foreground/40">
        Just once — we&apos;ll remember it on this device.
      </p>
    </form>
  );
}

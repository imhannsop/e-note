"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, type Profile } from "@/components/profiles";
import { Icon, useKeyboardInset } from "@/components/ui";

// Task states cycle open → done → moved; notes and ideas stay as-is.
type Kind = "task" | "note" | "idea";
type State = "open" | "done" | "moved";
type Entry = { id: string; kind: Kind; text: string; state: State; at: string };

const KINDS: { id: Kind; label: string; mark: string }[] = [
  { id: "task", label: "Task", mark: "●" },
  { id: "note", label: "Note", mark: "–" },
  { id: "idea", label: "Idea", mark: "*" },
];

const NEXT_STATE: Record<State, State> = { open: "done", done: "open", moved: "open" };

// Each entry style uses a different left edge and color treatment.
type Look = { key: string; label: string; mark: string; bar: string; text: string };
const LOOKS: Record<string, Look> = {
  task: { key: "task", label: "Task", mark: "●", bar: "border-l-[5px] border-solid border-[var(--ink)]", text: "" },
  done: {
    key: "done",
    label: "Done",
    mark: "−",
    bar: "border-l-[5px] border-solid border-[var(--gray)]",
    text: "text-[var(--gray)] line-through decoration-1",
  },
  moved: {
    key: "moved",
    label: "Moved",
    mark: ">",
    bar: "border-l-[5px] border-dashed border-[var(--gray)]",
    text: "text-[var(--gray)]",
  },
  note: { key: "note", label: "Note", mark: "–", bar: "border-l-[6px] border-double border-[var(--ink)]", text: "" },
  idea: {
    key: "idea",
    label: "Idea",
    mark: "*",
    bar: "border-l-[5px] border-solid border-[var(--accent)]",
    text: "italic",
  },
};

const lookOf = (e: Entry) => (e.kind === "task" && e.state !== "open" ? LOOKS[e.state] : LOOKS[e.kind]);

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  send: "M12 19V5M5 12l7-7 7 7",
  carry: "M5 12h14M13 6l6 6-6 6",
};

const dayKey = (iso: string) => iso.slice(0, 10);
const todayKey = () => dayKey(localDate());

// Store the timestamp in local time so each day is split at the user's midnight.
function localDate(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

function load(key: string): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

export default function DevLog({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const storageKey = `ink:devlog:${profile.id}`;
  const [entries, setEntries] = useState<Entry[]>(() => load(storageKey));
  const [kind, setKind] = useState<Kind>("task");
  const [draft, setDraft] = useState("");
  const keyboard = useKeyboardInset();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {}
  }, [storageKey, entries]);

  // Keep the newest entry in view as the list grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  const today = todayKey();
  const days = Object.entries(
    entries.reduce<Record<string, Entry[]>>((acc, e) => {
      (acc[dayKey(e.at)] ??= []).push(e);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));
  if (!days.some(([d]) => d === today)) days.push([today, []]);

  const todayTasks = entries.filter((e) => e.kind === "task" && dayKey(e.at) === today);
  const doneToday = todayTasks.filter((e) => e.state === "done").length;
  const firstDay = days[0][0];

  function add() {
    const text = draft.trim();
    if (!text) return;
    setEntries((es) => [...es, { id: crypto.randomUUID(), kind, text, state: "open", at: localDate() }]);
    setDraft("");
  }

  function cycle(id: string) {
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, state: NEXT_STATE[e.state] } : e)));
  }

  function removeEntry(id: string) {
    setEntries((es) => es.filter((e) => e.id !== id));
  }

  // Move any open tasks from an earlier day onto today and mark the originals as moved.
  function carryOver(day: string) {
    const now = localDate();
    setEntries((es) => {
      const open = es.filter((e) => e.kind === "task" && e.state === "open" && dayKey(e.at) === day);
      const ids = new Set(open.map((e) => e.id));
      return [
        ...es.map((e) => (ids.has(e.id) ? { ...e, state: "moved" as const } : e)),
        ...open.map((e) => ({ ...e, id: crypto.randomUUID(), at: now })),
      ];
    });
  }

  return (
    <section
      className="devlog fixed inset-x-0 top-0 z-50 flex flex-col"
      style={{
        bottom: keyboard,
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Header */}
      <header className="enter relative mx-4 flex h-12 shrink-0 items-center justify-between border-b border-foreground/15">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-10 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.close} />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-semibold">Dev log</span>
        <span className="rounded-full border border-foreground/30 px-3 py-1 text-xs text-[var(--gray)] tabular-nums">
          <b className="text-[var(--ink)]">{doneToday}</b>/{todayTasks.length} done
        </span>
      </header>

      {/* Current profile */}
      <div className="enter mx-4 flex items-center gap-3 pt-4" style={{ animationDelay: "60ms" }}>
        <Avatar profile={profile} className="size-12 rounded-2xl text-xl" />
        <span className="font-semibold">{profile.name}&apos;s logs</span>
      </div>

      {/* Entry list */}
      <div className="enter min-h-0 flex-1 overflow-y-auto px-4" style={{ animationDelay: "120ms" }}>
        {days.map(([day, list], i) => {
          const date = new Date(`${day}T00:00`);
          const n = Math.round((date.getTime() - new Date(`${firstDay}T00:00`).getTime()) / 86400000) + 1;
          const openCount = list.filter((e) => e.kind === "task" && e.state === "open").length;
          return (
            <div key={day} className="flex flex-col pb-4">
              {/* Date header anchors the day */}
              <div className={`sticky top-0 z-10 flex items-end justify-between gap-2 bg-[var(--paper)] pb-4 ${i === 0 ? "pt-3" : "pt-8"}`}>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-[0.3em] text-[var(--gray)] uppercase">
                    Day {String(n).padStart(2, "0")}
                    {day === today && " · Today"}
                  </span>
                  <h3 className="text-4xl leading-[0.95] font-semibold tracking-tighter text-[var(--ink)]">
                    {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    <span className="text-[var(--gray)]"> {date.getFullYear()}</span>
                  </h3>
                  {/* Key to the edge treatments */}
                  <ul
                    className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase"
                    aria-label="Legend"
                  >
                    {Object.values(LOOKS).map((l) => (
                      <li key={l.key} className={`rounded-r-md bg-foreground/[0.06] px-2.5 py-1.5 leading-none ${l.bar}`}>
                        {l.label}
                      </li>
                    ))}
                  </ul>
                </div>
                {day !== today && openCount > 0 && (
                  <button
                    type="button"
                    onClick={() => carryOver(day)}
                    className="flex h-8 items-center gap-1 rounded-full border border-foreground/20 px-3 text-xs font-medium transition-transform duration-200 active:scale-[0.97]"
                  >
                    Carry {openCount} <Icon d={ICONS.carry} className="size-3.5" />
                  </button>
                )}
              </div>

              {list.length === 0 && (
                <p className="rounded-2xl border border-dashed border-foreground/30 px-4 py-6 text-center text-sm text-[var(--gray)]">
                  Nothing logged yet.
                </p>
              )}

              <ul className="flex flex-col gap-3">
                {list.map((e) => {
                  const look = lookOf(e);
                  const isTask = e.kind === "task";
                  return (
                    <li
                      key={e.id}
                      className={`enter group flex items-start gap-3 rounded-2xl bg-foreground/[0.06] py-3 pr-2 pl-3 ${look.bar}`}
                    >
                      <button
                        type="button"
                        onClick={() => isTask && cycle(e.id)}
                        disabled={!isTask}
                        aria-label={isTask ? `Mark ${e.state === "done" ? "open" : "done"}` : look.label}
                        className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-sm leading-none font-bold transition-transform duration-200 active:scale-90 ${
                          isTask ? "border border-[var(--gray)]" : ""
                        } ${e.kind === "idea" ? "text-[var(--accent)]" : look.text ? "text-[var(--gray)]" : ""}`}
                      >
                        {look.mark}
                      </button>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className={`text-base leading-snug break-words transition-colors duration-200 ${look.text}`}>
                          {e.text}
                        </span>
                        <span className="text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase tabular-nums">
                          {e.at.slice(11, 16)} · {look.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEntry(e.id)}
                        aria-label="Delete"
                        className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--gray)] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 max-sm:opacity-100"
                      >
                        <Icon d={ICONS.close} className="size-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        <div ref={endRef} className="h-4" />
      </div>

      {/* Write an entry */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="enter mx-4 mt-2 flex shrink-0 flex-col gap-2 rounded-2xl border border-foreground/20 p-2"
        style={{ animationDelay: "180ms", marginBottom: keyboard > 0 ? 8 : "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-2" role="radiogroup" aria-label="Entry type">
          {KINDS.map((k) => {
            const active = kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKind(k.id)}
                className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm transition-all duration-200 active:scale-[0.97] ${
                  active ? "ink-solid font-semibold" : "font-medium text-[var(--gray)] hover:bg-foreground/10"
                }`}
              >
                <span className="font-mono">{k.mark}</span>
                {k.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={kind === "task" ? "Fix the thing…" : kind === "idea" ? "What if…" : "Today I learned…"}
            aria-label="New entry"
            className="h-12 min-w-0 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-foreground/30"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Add"
            className="ink-solid grid size-12 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-[0.97] disabled:opacity-30"
          >
            <Icon d={ICONS.send} className="size-6" />
          </button>
        </div>
      </form>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, type Profile } from "@/components/profiles";
import { Icon, useKeyboardInset } from "@/components/ui";
import { useDoc } from "@/components/useDoc";

type Kind = "task" | "note" | "idea";
type State = "open" | "done";
type Category = "school" | "personal";
type Entry = {
  id: string;
  kind: Kind;
  cat: Category;
  text: string;
  state: State;
  at: string;
};

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "school", label: "School" },
  { id: "personal", label: "Personal" },
];

const KINDS: { id: Kind; label: string; mark: string }[] = [
  { id: "task", label: "Task", mark: "●" },
  { id: "note", label: "Note", mark: "–" },
  { id: "idea", label: "Idea", mark: "*" },
];

const NEXT_STATE: Record<State, State> = {
  open: "done",
  done: "open",
};

type Look = {
  key: string;
  label: string;
  mark: string;
  bar: string;
  text: string;
};
const LOOKS: Record<string, Look> = {
  task: {
    key: "task",
    label: "Task",
    mark: "●",
    bar: "border-l-[5px] border-solid border-[var(--ink)]",
    text: "",
  },
  done: {
    key: "done",
    label: "Done",
    mark: "−",
    bar: "border-l-[5px] border-solid border-[var(--gray)]",
    text: "text-[var(--gray)] line-through decoration-1",
  },
  note: {
    key: "note",
    label: "Note",
    mark: "–",
    bar: "border-l-[6px] border-double border-[var(--ink)]",
    text: "",
  },
  idea: {
    key: "idea",
    label: "Idea",
    mark: "*",
    bar: "border-l-[5px] border-solid border-[var(--accent)]",
    text: "italic",
  },
};

const lookOf = (e: Entry) =>
  e.kind === "task" && e.state !== "open" ? LOOKS[e.state] : LOOKS[e.kind];

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  send: "M12 19V5M5 12l7-7 7 7",
  carry: "M5 12h14M13 6l6 6-6 6",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  prev: "M15 18l-6-6 6-6",
  next: "M9 18l6-6-6-6",
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function dayTone(list: Entry[]) {
  const tasks = list.filter((e) => e.kind === "task");
  if (tasks.length > 0 && tasks.every((e) => e.state !== "open"))
    return "ink-solid";
  return "ink-fill ink-dots";
}

const dayKey = (iso: string) => iso.slice(0, 10);
const todayKey = () => dayKey(localDate());

function localDate(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

// Older entries predate categories; they land in Personal.
const upgrade = (entries: Entry[]) =>
  entries.map((e) => ({
    ...e,
    cat: e.cat ?? "personal",
    state: (e.state as string) === "moved" ? ("done" as const) : e.state,
  }));

export default function DevLog({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const [all, setEntries, sync] = useDoc<Entry[]>(
    "devlog",
    `ink:devlog:${profile.id}`,
    [],
    upgrade,
  );
  const [cat, setCat] = useState<Category>("school");
  const entries = all.filter((e) => e.cat === cat);
  const [kind, setKind] = useState<Kind>("task");
  const [draft, setDraft] = useState("");
  const keyboard = useKeyboardInset();
  const endRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!history)
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length, history, cat]);

  const today = todayKey();
  const days = Object.entries(
    entries.reduce<Record<string, Entry[]>>((acc, e) => {
      (acc[dayKey(e.at)] ??= []).push(e);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));
  if (!days.some(([d]) => d === today)) days.push([today, []]);

  const todayTasks = entries.filter(
    (e) => e.kind === "task" && dayKey(e.at) === today,
  );
  const doneToday = todayTasks.filter((e) => e.state === "done").length;
  const firstDay = days[0][0];
  const byDay = Object.fromEntries(days);

  const monthDays = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells = [
    ...Array<null>(month.getDay()).fill(null),
    ...Array.from({ length: monthDays }, (_, i) =>
      keyOf(new Date(month.getFullYear(), month.getMonth(), i + 1)),
    ),
  ];
  const monthLogged = cells.filter((d) => d && byDay[d]?.length);
  const monthEntries = monthLogged.reduce((n, d) => n + byDay[d!].length, 0);
  const isThisMonth = keyOf(month).slice(0, 7) === today.slice(0, 7);

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSelected(null);
  }

  function add() {
    const text = draft.trim();
    if (!text) return;
    setEntries((es) => [
      ...es,
      { id: crypto.randomUUID(), kind, cat, text, state: "open", at: localDate() },
    ]);
    setDraft("");
  }

  function cycle(id: string) {
    setEntries((es) =>
      es.map((e) => (e.id === id ? { ...e, state: NEXT_STATE[e.state] } : e)),
    );
  }

  function removeEntry(id: string) {
    setEntries((es) => es.filter((e) => e.id !== id));
  }

  function carryOver(day: string) {
    const now = localDate();
    setEntries((es) => {
      const open = es.filter(
        (e) =>
          e.cat === cat &&
          e.kind === "task" &&
          e.state === "open" &&
          dayKey(e.at) === day,
      );
      const ids = new Set(open.map((e) => e.id));
      return [
        ...es.filter((e) => !ids.has(e.id)),
        ...open.map((e) => ({ ...e, at: now })),
      ];
    });
  }

  function renderDay(day: string, list: Entry[], i: number) {
    const date = new Date(`${day}T00:00`);
    const n =
      Math.round(
        (date.getTime() - new Date(`${firstDay}T00:00`).getTime()) / 86400000,
      ) + 1;
    const openCount = list.filter(
      (e) => e.kind === "task" && e.state === "open",
    ).length;
    return (
      <div key={day} className="flex flex-col pb-4">
        {}
        <div
          className={`sticky top-0 z-10 flex items-end justify-between gap-2 bg-[var(--paper)] pb-4 ${i === 0 ? "pt-3" : "pt-8"}`}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium tracking-[0.3em] text-[var(--gray)] uppercase">
              {n >= 1 ? `Day ${String(n).padStart(2, "0")}` : "Before day 01"}
              {day === today && " · Today"}
            </span>
            <h3 className="text-4xl leading-[0.95] font-semibold tracking-tighter text-[var(--ink)]">
              {date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              <span className="text-[var(--gray)]"> {date.getFullYear()}</span>
            </h3>
            <div className="mt-3 flex items-start gap-2">
              {}
              <ul
                className="flex flex-1 flex-wrap gap-2 text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase"
                aria-label="Legend"
              >
                {Object.values(LOOKS).map((l) => (
                  <li
                    key={l.key}
                    className={`rounded-r-md bg-foreground/[0.06] px-2.5 py-1.5 leading-none ${l.bar}`}
                  >
                    {l.label}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setHistory((h) => !h)}
                aria-pressed={history}
                className={`flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-foreground/30 px-2.5 text-[10px] font-medium tracking-widest uppercase transition-all duration-200 active:scale-[0.97] ${
                  history ? "ink-solid border-transparent" : ""
                }`}
              >
                <Icon
                  d={history ? ICONS.close : ICONS.calendar}
                  className="size-3.5"
                />
                {history ? "Close" : "History"}
              </button>
            </div>
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
                  aria-label={
                    isTask
                      ? `Mark ${e.state === "done" ? "open" : "done"}`
                      : look.label
                  }
                  className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-sm leading-none font-bold transition-transform duration-200 active:scale-90 ${
                    isTask ? "border border-[var(--gray)]" : ""
                  } ${e.kind === "idea" ? "text-[var(--accent)]" : look.text ? "text-[var(--gray)]" : ""}`}
                >
                  {look.mark}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className={`text-base leading-snug break-words transition-colors duration-200 ${look.text}`}
                  >
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
      <header className="enter relative mx-4 flex h-12 shrink-0 items-center justify-between border-b border-foreground/15">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-10 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.close} />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-semibold">
          {history ? "History" : "Dev log"}
        </span>
        <div className="flex items-center gap-1">
          {!history && (
            <span className="rounded-full border border-foreground/30 px-3 py-1 text-xs text-[var(--gray)] tabular-nums">
              <b className="text-[var(--ink)]">{doneToday}</b>/
              {todayTasks.length} done
            </span>
          )}
        </div>
      </header>

      {!sync.ready && !sync.error && (
        <p
          role="status"
          className="skeleton mx-auto mt-2 w-fit rounded-full px-4 py-1.5 text-xs font-medium"
        >
          Loading…
        </p>
      )}
      {sync.error && (
        <p
          role="alert"
          className="mx-4 mt-2 rounded-2xl border border-[var(--accent)] px-3 py-2 text-xs text-[var(--accent)]"
        >
          Not synced: {sync.error}
        </p>
      )}

      <div
        className="enter mx-4 flex items-center gap-3 pt-4"
        style={{ animationDelay: "60ms" }}
      >
        <Avatar profile={profile} className="size-12 rounded-2xl text-xl" />
        <span className="min-w-0 flex-1 truncate font-semibold">
          {profile.name}&apos;s logs
        </span>
        <div
          className="flex shrink-0 gap-1 rounded-full border border-foreground/20 p-1"
          role="radiogroup"
          aria-label="Category"
        >
          {CATEGORIES.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setCat(c.id);
                  setSelected(null);
                }}
                className={`h-8 rounded-full px-3 text-xs transition-all duration-200 active:scale-[0.97] ${
                  active
                    ? "ink-solid font-semibold"
                    : "font-medium text-[var(--gray)] hover:bg-foreground/10"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="enter min-h-0 flex-1 overflow-y-auto px-4"
        style={{ animationDelay: "120ms" }}
      >
        {history ? (
          <div className="flex flex-col gap-4 pt-4">
            <div className="ink-fill rounded-3xl p-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Previous month"
                  className="grid size-9 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
                >
                  <Icon d={ICONS.prev} />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-semibold tracking-tighter">
                    {month.toLocaleDateString(undefined, { month: "long" })}
                    <span className="text-[var(--gray)]">
                      {" "}
                      {month.getFullYear()}
                    </span>
                  </span>
                  <span className="text-[10px] font-medium tracking-[0.2em] text-[var(--gray)] uppercase tabular-nums">
                    {monthLogged.length} days · {monthEntries} entries
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  disabled={isThisMonth}
                  aria-label="Next month"
                  className="grid size-9 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97] disabled:opacity-20"
                >
                  <Icon d={ICONS.next} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
                {WEEKDAYS.map((w, i) => (
                  <span
                    key={i}
                    className="pb-1 text-[10px] font-medium tracking-widest text-[var(--gray)]"
                  >
                    {w}
                  </span>
                ))}
                {cells.map((d, i) => {
                  if (!d) return <span key={`pad-${i}`} />;
                  const list = byDay[d] ?? [];
                  const future = d > today;
                  const on = selected === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={future}
                      onClick={() => setSelected(on ? null : d)}
                      aria-pressed={on}
                      aria-label={`${d}, ${list.length} entries`}
                      className={`relative grid aspect-square place-items-center rounded-xl text-sm tabular-nums transition-transform duration-200 active:scale-[0.94] disabled:opacity-25 ${
                        list.length
                          ? `${dayTone(list)} font-semibold`
                          : "text-[var(--gray)]"
                      } ${on ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--paper)]" : ""} ${
                        d === today && !on
                          ? "underline decoration-2 underline-offset-4"
                          : ""
                      }`}
                    >
                      {Number(d.slice(8))}
                      {list.some((e) => e.kind === "idea") && (
                        <span
                          className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--accent)]"
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {}
              <div className="mt-4 flex items-center gap-2">
                <ul className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase">
                  <li className="flex items-center gap-1.5">
                    <span className="ink-fill ink-dots size-3 rounded" /> Logged
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="ink-solid size-3 rounded" /> All tasks done
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-[var(--accent)]" />{" "}
                    Idea
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => setHistory(false)}
                  className="ink-solid flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium tracking-widest uppercase transition-all duration-200 active:scale-[0.97]"
                >
                  <Icon d={ICONS.close} className="size-3.5" />
                  Close
                </button>
              </div>
            </div>

            {selected ? (
              <div key={selected} className="fade-in">
                {renderDay(selected, byDay[selected] ?? [], 0)}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-[var(--gray)]">
                Pick a day to read its log.
              </p>
            )}
          </div>
        ) : (
          days.map(([day, list], i) => renderDay(day, list, i))
        )}
        <div ref={endRef} className="h-4" />
      </div>

      {!history && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="enter mx-4 mt-2 flex shrink-0 flex-col gap-2 rounded-2xl border border-foreground/20 p-2"
          style={{
            animationDelay: "180ms",
            marginBottom:
              keyboard > 0 ? 8 : "max(0.75rem, env(safe-area-inset-bottom))",
          }}
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
                    active
                      ? "ink-solid font-semibold"
                      : "font-medium text-[var(--gray)] hover:bg-foreground/10"
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
              placeholder={
                kind === "task"
                  ? "Fix the thing…"
                  : kind === "idea"
                    ? "What if…"
                    : "Today I learned…"
              }
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
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { type Profile } from "@/components/profiles";
import TrendChart, { type Point } from "@/components/TrendChart";
import { Icon, useKeyboardInset } from "@/components/ui";

// A task lives from its start week; repeating ones carry forward until ended.
// Ending instead of deleting keeps past weeks intact as an archive.
type Task = { id: string; name: string; repeat: boolean; from: string; until?: string };
type Data = { tasks: Task[]; checks: Record<string, true> };
type View = "week" | "month";

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  prev: "M15 18l-6-6 6-6",
  next: "M9 18l6-6-6-6",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3",
};

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

// Local-time date keys, so weeks and days split at the user's midnight
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (k: string) => new Date(`${k}T00:00`);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const weekOf = (d: Date) => keyOf(addDays(d, -d.getDay())); // weeks start Sunday

const nextWeek = (week: string) => keyOf(addDays(parse(week), 7));

// One-off tasks end after their first week unless extended
function activeIn(t: Task, week: string) {
  const end = t.until ?? (t.repeat ? undefined : nextWeek(t.from));
  return week >= t.from && (!end || week < end);
}

function load(key: string): Data {
  try {
    const d = JSON.parse(localStorage.getItem(key) ?? "null");
    return d ?? { tasks: [], checks: {} };
  } catch {
    return { tasks: [], checks: {} };
  }
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="check-pop size-[70%] text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS.check} />
    </svg>
  );
}

export default function WeeklyPlanner({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const storageKey = `ink:planner:${profile.id}`;
  const [data, setData] = useState<Data>(() => load(storageKey));
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [menu, setMenu] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [repeat, setRepeat] = useState(true);
  const [span, setSpan] = useState<7 | 30 | 90>(30);
  const [picked, setPicked] = useState<string | null>(null);
  const keyboard = useKeyboardInset();

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {}
  }, [storageKey, data]);

  const today = keyOf(new Date());
  const week = weekOf(cursor);
  const weekStart = parse(week);
  const weekDays = Array.from({ length: 7 }, (_, i) => keyOf(addDays(weekStart, i)));
  const isThisWeek = week === weekOf(new Date());

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthDays = Array.from(
    { length: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate() },
    (_, i) => keyOf(addDays(monthStart, i)),
  );

  const days = view === "week" ? weekDays : monthDays;
  const tasks = data.tasks.filter((t) => days.some((d) => activeIn(t, weekOf(parse(d)))));

  // Checked cells over possible cells for one week
  function rate(w: string) {
    const ts = data.tasks.filter((t) => activeIn(t, w));
    // Only days that have happened count toward the rate
    const ds = Array.from({ length: 7 }, (_, i) => keyOf(addDays(parse(w), i))).filter((d) => d <= today);
    const done = ts.reduce((n, t) => n + ds.filter((d) => data.checks[`${t.id}:${d}`]).length, 0);
    const fullTasks = ds.length ? ts.filter((t) => ds.every((d) => data.checks[`${t.id}:${d}`])).length : 0;
    return { done, total: ts.length * ds.length, fullTasks, taskCount: ts.length };
  }
  const thisRate = rate(week);
  const lastRate = rate(keyOf(addDays(weekStart, -7)));
  // Daily points for the trend, ending at today or the end of what's on screen
  const trendEnd = [today, days[days.length - 1]].sort()[0];
  const pointsFrom = (end: string, n: number): Point[] =>
    Array.from({ length: n }, (_, i) => {
      const day = keyOf(addDays(parse(end), i - n + 1));
      const ts = data.tasks.filter((t) => activeIn(t, weekOf(parse(day))));
      return { day, done: ts.filter((t) => data.checks[`${t.id}:${day}`]).length, total: ts.length };
    });
  const trend = pointsFrom(trendEnd, span);
  const trendPrev = pointsFrom(keyOf(addDays(parse(trendEnd), -span)), span);

  const pct = (r: { done: number; total: number }) => (r.total ? Math.round((r.done / r.total) * 100) : 0);

  function step(dir: 1 | -1) {
    setMenu(null);
    setCursor((c) =>
      view === "week" ? addDays(c, dir * 7) : new Date(c.getFullYear(), c.getMonth() + dir, 1),
    );
  }

  function toggle(taskId: string, day: string) {
    const k = `${taskId}:${day}`;
    setData((d) => {
      const checks = { ...d.checks };
      if (checks[k]) delete checks[k];
      else checks[k] = true;
      return { ...d, checks };
    });
  }

  function addTask() {
    const name = draft.trim();
    if (!name) return;
    setData((d) => ({ ...d, tasks: [...d.tasks, { id: crypto.randomUUID(), name, repeat, from: week }] }));
    setDraft("");
  }

  function toggleRepeat(t: Task) {
    setData((d) => ({
      ...d,
      // Stopping a repeat ends it after this week; past weeks keep it
      tasks: d.tasks.map((x) =>
        x.id === t.id ? { ...x, repeat: !x.repeat, until: x.repeat ? nextWeek(week) : undefined } : x,
      ),
    }));
  }

  // Past weeks keep the task; from this week on it's gone
  function removeTask(t: Task) {
    setMenu(null);
    setData((d) => ({
      ...d,
      tasks:
        t.from >= week
          ? d.tasks.filter((x) => x.id !== t.id)
          : d.tasks.map((x) => (x.id === t.id ? { ...x, until: week } : x)),
    }));
  }

  const rangeLabel =
    view === "week"
      ? `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}–${addDays(weekStart, 6).toLocaleDateString(undefined, weekStart.getMonth() === addDays(weekStart, 6).getMonth() ? { day: "numeric" } : { month: "short", day: "numeric" })}`
      : cursor.toLocaleDateString(undefined, { month: "long" });

  // Month view: the tapped day, else today if it's in this month, else the 1st
  const selected = picked && monthDays.includes(picked) ? picked : monthDays.includes(today) ? today : monthDays[0];

  return (
    <section
      className="planner fixed inset-x-0 top-0 z-50 flex flex-col"
      style={{
        bottom: keyboard,
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Top navigation */}
      <header className="enter relative mx-4 flex h-12 shrink-0 items-center justify-between border-b border-foreground/15">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-10 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.close} />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold whitespace-nowrap">
          {view === "week" ? "Weekly planner" : "Monthly tracker"}
        </span>
        <div className="flex rounded-full border border-foreground/30 p-0.5 text-xs font-medium" role="radiogroup" aria-label="View">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => {
                setView(v);
                setMenu(null);
              }}
              className={`h-7 rounded-full px-2.5 capitalize transition-all duration-200 ${view === v ? "ink-solid" : "text-[var(--gray)]"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {/* Week / month header */}
      <div className="enter mx-4 flex items-end justify-between gap-2 pt-4 pb-4" style={{ animationDelay: "60ms" }}>
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={`Previous ${view}`}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-foreground/20 transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.prev} />
        </button>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <span className="text-xs font-medium tracking-[0.3em] text-[var(--gray)] uppercase">
            {view === "week" ? "Week of" : "Month of"} · {cursor.getFullYear()}
          </span>
          <h2 className="text-4xl leading-[0.95] font-semibold tracking-tighter text-[var(--ink)]">{rangeLabel}</h2>
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label={`Next ${view}`}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-foreground/20 transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.next} />
        </button>
      </div>

      {/* The grid */}
      <div className="enter mx-4 min-h-0 flex-1 overflow-y-auto" style={{ animationDelay: "120ms" }}>
        {view === "month" ? (
          <MonthView
            days={monthDays}
            today={today}
            selected={selected}
            onSelect={setPicked}
            tasks={data.tasks}
            checks={data.checks}
            onToggle={toggle}
          />
        ) : (
        <div
          className="grid gap-px overflow-hidden rounded-2xl border border-[var(--ink)] bg-[var(--ink)]"
          style={{ gridTemplateColumns: "minmax(6.5rem,34%) repeat(7, minmax(0,1fr))" }}
          aria-label={`${rangeLabel} tracker`}
        >
          {/* Header row, set off by a heavier rule */}
          <div className="flex items-end bg-[color-mix(in_srgb,var(--ink)_9%,var(--paper))] px-3 pb-2 text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase border-b-2 border-[var(--ink)]">
            Task
          </div>
          {days.map((d) => {
            const date = parse(d);
            const isToday = d === today;
            return (
              <div
                key={d}
                className="flex flex-col items-center justify-center gap-0.5 border-b-2 border-[var(--ink)] bg-[var(--paper)] py-2"
              >
                <span className="text-[11px] font-bold text-[var(--ink)]">{DAY_LETTERS[date.getDay()]}</span>
                <span
                  className={`grid size-6 place-items-center rounded-full text-[11px] tabular-nums ${
                    isToday ? "ink-solid font-bold" : "text-[var(--gray)]"
                  }`}
                  aria-current={isToday ? "date" : undefined}
                >
                  {date.getDate()}
                </span>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div
              className="bg-[var(--paper)] px-4 py-8 text-center text-sm text-[var(--gray)]"
              style={{ gridColumn: "1 / -1" }}
            >
              No tasks this week. Add one below.
            </div>
          )}

          {tasks.map((t) => (
            <Row
              key={t.id}
              task={t}
              days={days}
              today={today}
              checks={data.checks}
              open={menu === t.id}
              onMenu={() => setMenu((m) => (m === t.id ? null : t.id))}
              onToggle={(d) => toggle(t.id, d)}
              onRepeat={() => toggleRepeat(t)}
              onRemove={() => removeTask(t)}
            />
          ))}
        </div>
        )}

        {(view === "week"
          ? !isThisWeek
          : cursor.getMonth() !== new Date().getMonth() || cursor.getFullYear() !== new Date().getFullYear()) && (
          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={() => {
                setCursor(new Date());
                setPicked(null);
              }}
              className="h-9 rounded-full border border-foreground/30 px-4 text-xs font-medium transition-transform duration-200 active:scale-[0.97]"
            >
              Back to today
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1 pt-3 pb-4 text-xs text-[var(--gray)]">
          <span>
            <b className="text-[var(--ink)]">{thisRate.fullTasks}</b>/{thisRate.taskCount} tasks done every day so far this week
          </span>
          <span className="tabular-nums">
            {pct(thisRate)}% this week · {pct(lastRate)}% last
            {thisRate.total > 0 && lastRate.total > 0 && (
              <b className="text-[var(--ink)]"> {pct(thisRate) >= pct(lastRate) ? "↑" : "↓"}</b>
            )}
          </span>
        </div>

        {/* Trend */}
        <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-foreground/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Momentum</h3>
            <div className="flex rounded-full border border-foreground/30 p-0.5 text-xs font-medium" role="radiogroup" aria-label="Range">
              {([7, 30, 90] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={span === n}
                  onClick={() => setSpan(n)}
                  className={`h-7 rounded-full px-2.5 tabular-nums transition-all duration-200 ${span === n ? "ink-solid" : "text-[var(--gray)]"}`}
                >
                  {n}D
                </button>
              ))}
            </div>
          </div>
          <TrendChart points={trend} previous={trendPrev} />
        </section>
      </div>

      {/* Quick add */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTask();
        }}
        className="enter mx-4 mt-1 flex shrink-0 items-center gap-2 rounded-2xl border border-foreground/20 p-2"
        style={{ animationDelay: "180ms", marginBottom: keyboard > 0 ? 8 : "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          role="switch"
          aria-checked={repeat}
          aria-label="Repeat every week"
          onClick={() => setRepeat((r) => !r)}
          className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
            repeat ? "ink-solid" : "border border-foreground/30 text-[var(--gray)]"
          }`}
        >
          <Icon d={ICONS.repeat} className="size-4" />
          {repeat ? "Weekly" : "Once"}
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New task…"
          aria-label="New task"
          className="h-12 min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-foreground/30"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Add task"
          className="ink-solid grid size-12 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-[0.97] disabled:opacity-30"
        >
          <Icon d={ICONS.plus} className="size-6" />
        </button>
      </form>
    </section>
  );
}

function Row({
  task,
  days,
  today,
  checks,
  open,
  onMenu,
  onToggle,
  onRepeat,
  onRemove,
}: {
  task: Task;
  days: string[];
  today: string;
  checks: Record<string, true>;
  open: boolean;
  onMenu: () => void;
  onToggle: (day: string) => void;
  onRepeat: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      {/* Task label: tap or right-click for actions */}
      <button
        type="button"
        onClick={onMenu}
        onContextMenu={(e) => {
          e.preventDefault();
          onMenu();
        }}
        aria-expanded={open}
        className="flex min-h-12 min-w-0 items-center gap-1.5 bg-[color-mix(in_srgb,var(--ink)_9%,var(--paper))] px-3 py-3 text-left text-sm leading-snug text-[var(--ink)] break-words"
      >
        <span className="min-w-0 flex-1">{task.name}</span>
        {task.repeat && <Icon d={ICONS.repeat} className="size-3 shrink-0 text-[var(--gray)]" />}
      </button>

      {days.map((d) => {
        const done = !!checks[`${task.id}:${d}`];
        const active = activeIn(task, weekOfKey(d));
        const label = `${task.name}, ${parse(d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`;
        return (
          <button
            key={d}
            type="button"
            disabled={!active}
            aria-pressed={done}
            aria-label={label}
            onClick={() => onToggle(d)}
            className={`grid min-h-12 place-items-center transition-colors duration-200 disabled:cursor-default ${
              !active
                ? "bg-[color-mix(in_srgb,var(--ink)_4%,var(--paper))]"
                : done
                  ? "bg-[color-mix(in_srgb,var(--gray)_18%,var(--paper))]"
                  : d === today
                    ? "bg-[color-mix(in_srgb,var(--ink)_5%,var(--paper))]"
                    : "bg-[var(--paper)]"
            }`}
          >
            {done && <Check />}
          </button>
        );
      })}

      {open && (
        <div className="enter flex items-center gap-2 bg-[var(--paper)] px-3 py-2" style={{ gridColumn: "1 / -1" }}>
          <button
            type="button"
            onClick={onRepeat}
            className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
              task.repeat ? "ink-solid" : "border border-foreground/30 text-[var(--gray)]"
            }`}
          >
            <Icon d={ICONS.repeat} className="size-4" />
            {task.repeat ? "Repeats weekly" : "This week only"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto flex h-9 items-center gap-1.5 rounded-full border border-foreground/30 px-3 text-xs font-medium transition-all duration-200 active:scale-[0.97]"
          >
            <Icon d={ICONS.trash} className="size-4" />
            Delete
          </button>
        </div>
      )}
    </>
  );
}

const weekOfKey = (d: string) => weekOf(parse(d));

// Calendar month that fits the screen: each day shows its done/total,
// and the tapped day's checklist sits underneath
function MonthView({
  days,
  today,
  selected,
  onSelect,
  tasks,
  checks,
  onToggle,
}: {
  days: string[];
  today: string;
  selected: string;
  onSelect: (day: string) => void;
  tasks: Task[];
  checks: Record<string, true>;
  onToggle: (taskId: string, day: string) => void;
}) {
  const lead = parse(days[0]).getDay();
  const trail = (7 - ((lead + days.length) % 7)) % 7;
  const dayTasks = (d: string) => tasks.filter((t) => activeIn(t, weekOfKey(d)));
  const selTasks = dayTasks(selected);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-[var(--ink)] bg-[var(--ink)]">
        {DAY_LETTERS.map((l, i) => (
          <div key={i} className="border-b-2 border-[var(--ink)] bg-[var(--paper)] py-2 text-center text-[11px] font-bold">
            {l}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} className="bg-[color-mix(in_srgb,var(--ink)_4%,var(--paper))]" />
        ))}
        {days.map((d) => {
          const ts = dayTasks(d);
          const done = ts.filter((t) => checks[`${t.id}:${d}`]).length;
          const future = d > today;
          const all = ts.length > 0 && done === ts.length;
          const isSel = d === selected;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={isSel}
              aria-label={`${parse(d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}, ${done} of ${ts.length} done`}
              className={`relative flex aspect-square min-w-0 flex-col items-center justify-between p-1 transition-colors duration-150 ${
                isSel ? "bg-[color-mix(in_srgb,var(--ink)_10%,var(--paper))]" : "bg-[var(--paper)]"
              }`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-[11px] tabular-nums ${
                  d === today ? "ink-solid font-bold" : future ? "text-[var(--gray)]" : "font-medium"
                }`}
              >
                {parse(d).getDate()}
              </span>
              {all ? (
                <svg viewBox="0 0 24 24" className="size-4 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={ICONS.check} />
                </svg>
              ) : ts.length > 0 && !future ? (
                // Progress bar: filled share of the day's tasks
                <span className="mb-1 h-1 w-3/4 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_12%,var(--paper))]">
                  <span className="block h-full bg-[var(--ink)]" style={{ width: `${(done / ts.length) * 100}%` }} />
                </span>
              ) : (
                <span className="h-2" />
              )}
              {isSel && <span className="pointer-events-none absolute inset-0 border-2 border-[var(--ink)]" />}
            </button>
          );
        })}
        {Array.from({ length: trail }, (_, i) => (
          <div key={`trail-${i}`} className="bg-[color-mix(in_srgb,var(--ink)_4%,var(--paper))]" />
        ))}
      </div>

      {/* The picked day's checklist */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xl font-semibold tracking-tight">
            {parse(selected).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </h3>
          <span className="text-xs text-[var(--gray)] tabular-nums">
            {selTasks.filter((t) => checks[`${t.id}:${selected}`]).length}/{selTasks.length} done
          </span>
        </div>
        {selTasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-foreground/30 px-4 py-6 text-center text-sm text-[var(--gray)]">
            No tasks this day.
          </p>
        ) : (
          <ul className="flex flex-col overflow-hidden rounded-2xl border border-[var(--ink)]">
            {selTasks.map((t, i) => {
              const done = !!checks[`${t.id}:${selected}`];
              return (
                <li key={t.id} className={i ? "border-t border-foreground/15" : ""}>
                  <button
                    type="button"
                    aria-pressed={done}
                    onClick={() => onToggle(t.id, selected)}
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left"
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-md border transition-colors duration-200 ${
                        done ? "border-[var(--gray)] bg-[color-mix(in_srgb,var(--gray)_18%,var(--paper))]" : "border-[var(--ink)]"
                      }`}
                    >
                      {done && <Check />}
                    </span>
                    <span className={`min-w-0 flex-1 text-sm break-words ${done ? "text-[var(--gray)]" : ""}`}>{t.name}</span>
                    {t.repeat && <Icon d={ICONS.repeat} className="size-3 shrink-0 text-[var(--gray)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

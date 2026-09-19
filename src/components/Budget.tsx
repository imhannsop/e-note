"use client";

import { useState } from "react";
import { Icon, useKeyboardInset } from "@/components/ui";
import { useDoc } from "@/components/useDoc";

type Expense = {
  id: string;
  day: string;
  amount: number;
  category: string;
  note?: string;
};
// budgets[day] is set when the user changes it; later days inherit the latest one
// weeks[first day of week] and months["YYYY-MM"] are set separately by the user
type Data = {
  budgets: Record<string, number>;
  weeks?: Record<string, number>;
  months?: Record<string, number>;
  expenses: Expense[];
};
type Range = "day" | "week" | "month";

const CURRENCY = "₱";

const CATEGORIES = [
  { id: "food", label: "Food", color: "#c8321f" },
  { id: "transport", label: "Transport", color: "#2f6fb0" },
  { id: "school", label: "School", color: "#d99a1e" },
  { id: "bills", label: "Bills", color: "#3f8f5a" },
  { id: "fun", label: "Fun", color: "#8a4fb8" },
  { id: "other", label: "Other", color: "#7a7a7a" },
] as const;

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  prev: "M15 18l-6-6 6-6",
  next: "M9 18l6-6-6-6",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3",
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const money = (n: number) =>
  `${n < 0 ? "−" : ""}${CURRENCY}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const categoryOf = (id: string) =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

function budgetFor(budgets: Record<string, number>, day: string) {
  let best: string | null = null;
  for (const k in budgets) if (k <= day && (!best || k > best)) best = k;
  return best ? budgets[best] : 0;
}

function daysIn(range: Range, cursor: Date) {
  if (range === "day") return [keyOf(cursor)];
  if (range === "week") {
    const start = addDays(cursor, -cursor.getDay());
    return Array.from({ length: 7 }, (_, i) => keyOf(addDays(start, i)));
  }
  const n = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) =>
    keyOf(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  );
}

export default function Budget({ onClose }: { onClose: () => void }) {
  const [data, setData, sync] = useDoc<Data>("budget", "ink:budget", {
    budgets: {},
    expenses: [],
  });
  const [cursor, setCursor] = useState(() => new Date());
  const [range, setRange] = useState<Range>("day");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [editing, setEditing] = useState<string | null>(null);
  const keyboard = useKeyboardInset();

  const today = keyOf(new Date());
  const day = keyOf(cursor);
  const days = daysIn(range, cursor);
  const inRange = data.expenses.filter((e) => days.includes(e.day));
  const month = day.slice(0, 7);
  const week = days[0];
  const monthly = range === "month";
  const budget =
    range === "day"
      ? budgetFor(data.budgets, day)
      : ((monthly ? data.months?.[month] : data.weeks?.[week]) ?? 0);
  const spent = inRange.reduce((n, e) => n + e.amount, 0);
  const slices = CATEGORIES.map((c) => ({
    ...c,
    value: inRange
      .filter((e) => categoryOf(e.category).id === c.id)
      .reduce((n, e) => n + e.amount, 0),
  })).filter((s) => s.value > 0);
  const dayExpenses = data.expenses
    .filter((e) => e.day === day)
    .toReversed();

  function step(dir: 1 | -1) {
    setCursor((c) => addDays(c, dir));
  }

  function saveBudget(value: number) {
    setData((d) =>
      range === "month"
        ? { ...d, months: { ...d.months, [month]: value } }
        : range === "week"
          ? { ...d, weeks: { ...d.weeks, [week]: value } }
          : { ...d, budgets: { ...d.budgets, [day]: value } },
    );
  }

  function addExpense() {
    const n = Number(amount);
    if (!(n > 0)) return;
    setData((d) => ({
      ...d,
      expenses: [
        ...d.expenses,
        {
          id: crypto.randomUUID(),
          day,
          amount: Math.round(n * 100) / 100,
          category,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      ],
    }));
    setAmount("");
    setNote("");
  }

  function removeExpense(id: string) {
    setData((d) => ({
      ...d,
      expenses: d.expenses.filter((e) => e.id !== id),
    }));
  }

  const left = budget - spent;

  return (
    <section
      className="budget fixed inset-x-0 top-0 z-50 flex flex-col"
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
        <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold whitespace-nowrap">
          Budget tracker
        </span>
        <span className="size-10" />
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
        className="enter mx-4 flex items-end justify-between gap-2 pt-4 pb-4"
        style={{ animationDelay: "60ms" }}
      >
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous day"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-foreground/20 transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.prev} />
        </button>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <span className="text-xs font-medium tracking-[0.3em] text-[var(--gray)] uppercase">
            {day === today
              ? "Today"
              : cursor.toLocaleDateString(undefined, { weekday: "long" })}{" "}
            · {cursor.getFullYear()}
          </span>
          <h2 className="text-4xl leading-[0.95] font-semibold tracking-tighter text-[var(--ink)]">
            {cursor.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next day"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-foreground/20 transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.next} />
        </button>
      </div>

      <div
        className="enter mx-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4"
        style={{ animationDelay: "120ms" }}
      >
        {day !== today && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setCursor(new Date())}
              className="h-9 rounded-full border border-foreground/30 px-4 text-xs font-medium transition-transform duration-200 active:scale-[0.97]"
            >
              Back to today
            </button>
          </div>
        )}

        <section className="flex items-center justify-between gap-3 rounded-2xl border border-foreground/20 p-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase">
              {monthly
                ? `Budget for ${cursor.toLocaleDateString(undefined, { month: "long" })}`
                : range === "week"
                  ? `Budget for week of ${new Date(`${week}T00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                  : "Budget for this day"}
            </span>
            {editing !== null ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(editing);
                  if (n >= 0) saveBudget(Math.round(n * 100) / 100);
                  setEditing(null);
                }}
                className="flex items-center gap-1"
              >
                <span className="text-2xl font-semibold">{CURRENCY}</span>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={editing}
                  onChange={(e) =>
                    setEditing(e.target.value.replace(/[^\d.]/g, ""))
                  }
                  onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                  aria-label={`${range === "day" ? "Daily" : `${range}ly`} budget`}
                  className="w-32 border-b border-foreground/30 bg-transparent text-2xl font-semibold outline-none"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setEditing(String(budget || ""))
                }
                className="text-left text-2xl font-semibold tabular-nums"
              >
                {money(budget)}
                <span className="ml-2 text-xs font-medium text-[var(--gray)] underline">
                  edit
                </span>
              </button>
            )}
          </div>
          <span className="max-w-[45%] text-right text-xs text-[var(--gray)]">
            {range !== "day"
              ? `Your spending limit for the whole ${range}`
              : "Carries over to the next days until you change it"}
          </span>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-foreground/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Summary</h3>
            <div
              className="flex rounded-full border border-foreground/30 p-0.5 text-xs font-medium"
              role="radiogroup"
              aria-label="Range"
            >
              {(["day", "week", "month"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={range === r}
                  onClick={() => {
                    setRange(r);
                    setEditing(null);
                  }}
                  className={`h-7 rounded-full px-2.5 capitalize transition-all duration-200 ${range === r ? "ink-solid" : "text-[var(--gray)]"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Pie
              slices={slices}
              rest={Math.max(left, 0)}
              label={money(spent)}
              sub={
                budget > 0
                  ? `of ${money(budget)}`
                  : "spent"
              }
            />
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
              {slices.length === 0 && (
                <li className="text-[var(--gray)]">Nothing spent yet.</li>
              )}
              {slices.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="flex-1 truncate">{s.label}</span>
                  <span className="tabular-nums">{money(s.value)}</span>
                </li>
              ))}
              {budget > 0 && (
                <li
                  className={`mt-1 flex items-center gap-2 border-t border-foreground/15 pt-1.5 font-semibold ${left < 0 ? "text-[var(--accent)]" : ""}`}
                >
                  <span className="size-2.5 shrink-0 rounded-full border border-foreground/30" />
                  <span className="flex-1">{left < 0 ? "Over" : "Left"}</span>
                  <span className="tabular-nums">{money(Math.abs(left))}</span>
                </li>
              )}
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase">
            Expenses this day
          </h3>
          {dayExpenses.length === 0 && (
            <p className="rounded-2xl border border-dashed border-foreground/20 px-4 py-6 text-center text-sm text-[var(--gray)]">
              No expenses yet. Add one below.
            </p>
          )}
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-2xl border border-foreground/20">
            {dayExpenses.map((e) => {
              const c = categoryOf(e.category);
              return (
                <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: c.color }}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {e.note || c.label}
                    </span>
                    {e.note && (
                      <span className="text-xs text-[var(--gray)]">
                        {c.label}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {money(e.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExpense(e.id)}
                    aria-label={`Delete ${e.note || c.label} expense`}
                    className="grid size-8 place-items-center rounded-full text-[var(--gray)] transition-transform duration-200 active:scale-[0.97]"
                  >
                    <Icon d={ICONS.trash} className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addExpense();
        }}
        className="enter mx-4 mt-1 flex shrink-0 flex-col gap-2 rounded-2xl border border-foreground/20 p-2"
        style={{
          animationDelay: "180ms",
          marginBottom:
            keyboard > 0 ? 8 : "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div
          className="flex gap-1.5 overflow-x-auto"
          role="radiogroup"
          aria-label="Category"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-200 ${category === c.id ? "ink-solid" : "border border-foreground/30 text-[var(--gray)]"}`}
            >
              <span
                className="size-2 rounded-full"
                style={{ background: c.color }}
              />
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            placeholder={`${CURRENCY}0`}
            aria-label="Amount"
            className="h-12 w-24 shrink-0 rounded-xl border border-foreground/20 bg-transparent px-3 text-base tabular-nums outline-none placeholder:text-foreground/30"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What for? (optional)"
            aria-label="Note"
            maxLength={80}
            className="h-12 min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-foreground/30"
          />
          <button
            type="submit"
            disabled={!(Number(amount) > 0)}
            aria-label="Add expense"
            className="ink-solid grid size-12 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-[0.97] disabled:opacity-30"
          >
            <Icon d={ICONS.plus} className="size-6" />
          </button>
        </div>
      </form>
    </section>
  );
}

function Pie({
  slices,
  rest,
  label,
  sub,
}: {
  slices: { id: string; label: string; color: string; value: number }[];
  rest: number;
  label: string;
  sub: string;
}) {
  const total = slices.reduce((n, s) => n + s.value, 0) + rest;
  const r = 15.9155; // circumference = 100
  let offset = 0;
  return (
    <div className="relative size-36 shrink-0">
      <svg
        viewBox="0 0 36 36"
        className="size-full -rotate-90"
        role="img"
        aria-label={slices
          .map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`)
          .join(", ")}
      >
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth="4"
        />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.value / total) * 100;
            const el = (
              <circle
                key={s.id}
                cx="18"
                cy="18"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="4"
                strokeDasharray={`${len} ${100 - len}`}
                strokeDashoffset={-offset}
                className="transition-all duration-500"
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base leading-tight font-semibold tabular-nums">
          {label}
        </span>
        <span className="text-[10px] text-[var(--gray)]">{sub}</span>
      </div>
    </div>
  );
}

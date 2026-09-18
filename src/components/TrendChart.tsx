"use client";

import { useEffect, useRef, useState } from "react";

export type Point = { day: string; done: number; total: number };

const H = 160;
const PAD = { top: 12, right: 40, bottom: 22, left: 4 };

const pctOf = (p: Point) => (p.total ? (p.done / p.total) * 100 : null);
const fmtDay = (k: string, opts: Intl.DateTimeFormatOptions) => new Date(`${k}T00:00`).toLocaleDateString(undefined, opts);

export function rateOf(points: Point[]) {
  const done = points.reduce((n, p) => n + p.done, 0);
  const total = points.reduce((n, p) => n + p.total, 0);
  return total ? (done / total) * 100 : null;
}

export default function TrendChart({ points, previous }: { points: Point[]; previous: Point[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotW = w - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const n = points.length;
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - v / 100) * plotH;

  const runs: { i: number; v: number }[][] = [];
  let run: { i: number; v: number }[] = [];
  points.forEach((p, i) => {
    const v = pctOf(p);
    if (v === null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push({ i, v });
  });
  if (run.length) runs.push(run);

  const line = (r: { i: number; v: number }[]) => r.map((q, k) => `${k ? "L" : "M"}${x(q.i)},${y(q.v)}`).join("");
  const area = (r: { i: number; v: number }[]) =>
    `${line(r)}L${x(r[r.length - 1].i)},${y(0)}L${x(r[0].i)},${y(0)}Z`;

  const lastRun = runs[runs.length - 1];
  const last = lastRun?.[lastRun.length - 1];

  const rate = rateOf(points);
  const prev = rateOf(previous);
  const delta = rate !== null && prev !== null ? rate - prev : null;

  const hp = hover !== null ? points[hover] : null;
  const hv = hp ? pctOf(hp) : null;

  function track(clientX: number) {
    const r = box.current?.getBoundingClientRect();
    if (!r || n === 0) return;
    const t = (clientX - r.left - PAD.left) / plotW;
    setHover(Math.min(n - 1, Math.max(0, Math.round(t * (n - 1)))));
  }

  const xTicks = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase">
            Completion · last {n} days
          </span>
          <span className="text-3xl leading-none font-semibold tracking-tighter tabular-nums">
            {rate === null ? "—" : `${rate.toFixed(1)}%`}
          </span>
        </div>
        <span className="text-xs text-[var(--gray)] tabular-nums">
          {delta === null ? (
            "no earlier data"
          ) : (
            <>
              <b className="text-[var(--ink)]">
                {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {delta > 0 ? "+" : ""}
                {delta.toFixed(1)} pts
              </b>{" "}
              vs prior {n} days
            </>
          )}
        </span>
      </figcaption>

      <div
        ref={box}
        className="relative touch-pan-y select-none"
        onPointerMove={(e) => track(e.clientX)}
        onPointerDown={(e) => track(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <svg width={w} height={H} className="block overflow-visible" role="img" aria-label={`Daily completion rate, ${rate === null ? "no data" : `${rate.toFixed(1)}% overall`}`}>
          {}
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(v)}
                y2={y(v)}
                stroke="currentColor"
                strokeOpacity={v === 0 ? 0.35 : 0.1}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text x={w - PAD.right + 6} y={y(v)} dy="0.32em" className="fill-[var(--gray)] text-[10px] tabular-nums">
                {v}%
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"}
              className="fill-[var(--gray)] text-[10px]"
            >
              {fmtDay(points[i].day, { month: "short", day: "numeric" })}
            </text>
          ))}

          {runs.map((r, k) => (
            <g key={k}>
              <path d={area(r)} fill="currentColor" fillOpacity={0.06} />
              {r.length > 1 ? (
                <path d={line(r)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ) : (
                <circle cx={x(r[0].i)} cy={y(r[0].v)} r={2.5} fill="currentColor" />
              )}
            </g>
          ))}

          {}
          {last && hover === null && (
            <g>
              <circle cx={x(last.i)} cy={y(last.v)} r={4} fill="currentColor" stroke="var(--paper)" strokeWidth={2} />
              <line x1={x(last.i)} x2={w - PAD.right} y1={y(last.v)} y2={y(last.v)} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />
            </g>
          )}

          {}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1} shapeRendering="crispEdges" />
              {hv !== null && <circle cx={x(hover)} cy={y(hv)} r={4.5} fill="currentColor" stroke="var(--paper)" strokeWidth={2} />}
            </g>
          )}
        </svg>

        {hp && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1.5 text-xs shadow-sm"
            style={{
              left: Math.min(Math.max(x(hover!) - 60, 0), w - 120),
              width: 120,
            }}
          >
            <div className="font-semibold tabular-nums">{hv === null ? "No tasks" : `${hv.toFixed(0)}%`}</div>
            <div className="text-[var(--gray)] tabular-nums">
              {hp.done}/{hp.total} · {fmtDay(hp.day, { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
        )}
      </div>

      <details className="text-xs text-[var(--gray)]">
        <summary className="cursor-pointer select-none">Show as table</summary>
        <table className="mt-2 w-full tabular-nums">
          <thead>
            <tr className="text-left">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Done</th>
              <th className="py-1 text-right font-medium">Rate</th>
            </tr>
          </thead>
          <tbody className="text-[var(--ink)]">
            {[...points].reverse().map((p) => {
              const v = pctOf(p);
              return (
                <tr key={p.day} className="border-t border-foreground/10">
                  <td className="py-1">{fmtDay(p.day, { weekday: "short", month: "short", day: "numeric" })}</td>
                  <td className="py-1 text-right">
                    {p.done}/{p.total}
                  </td>
                  <td className="py-1 text-right">{v === null ? "—" : `${v.toFixed(0)}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

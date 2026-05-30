"use client";

import { useState, useTransition } from "react";
import { weekStartISO, friendlyDate } from "../../lib/week";

type PaintAction = (
  weekIndex: number,
  available: boolean,
) => Promise<{ error?: string }>;

/**
 * Coarse, week-level "When2Meet" painting. Click a week to toggle "I could
 * travel that week". Updates optimistically and persists via a server action.
 */
export default function WeekCalendar({
  weekCount,
  windowStartMs,
  initialWeeks,
  action,
}: {
  weekCount: number;
  windowStartMs: number;
  initialWeeks: number[];
  action: PaintAction;
}) {
  const [painted, setPainted] = useState<Set<number>>(new Set(initialWeeks));
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(weekIndex: number) {
    const next = new Set(painted);
    const willBeAvailable = !next.has(weekIndex);
    if (willBeAvailable) next.add(weekIndex);
    else next.delete(weekIndex);
    setPainted(next);
    setError(null);
    startTransition(async () => {
      const res = await action(weekIndex, willBeAvailable);
      if (res.error) {
        // Revert on failure.
        setPainted((cur) => {
          const reverted = new Set(cur);
          if (willBeAvailable) reverted.delete(weekIndex);
          else reverted.add(weekIndex);
          return reverted;
        });
        setError(res.error);
      }
    });
  }

  const weeks = Array.from({ length: weekCount }, (_, i) => i);

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
        {weeks.map((w) => {
          const on = painted.has(w);
          const iso = weekStartISO(windowStartMs, w);
          return (
            <button
              key={w}
              type="button"
              onClick={() => toggle(w)}
              title={`Week of ${iso}`}
              className={`rounded-md border px-1 py-2 text-center text-[11px] leading-tight transition-colors ${
                on
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              {friendlyDate(iso)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-400">
        Click any week you could travel. Painted weeks are weeks you&apos;re free.
      </p>
    </div>
  );
}

import type { HeatmapCell } from "../../lib/availability";
import { friendlyDate } from "../../lib/week";

/**
 * Read-only merged availability across the whole group. Darker = more members
 * free that week; a ring marks weeks where EVERYONE is free (the planning
 * overlap the engine can choose dates from).
 */
export default function OverlapHeatmap({
  cells,
  memberCount,
}: {
  cells: HeatmapCell[];
  memberCount: number;
}) {
  const overlapCount = cells.filter((c) => c.isOverlap).length;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
        {cells.map((c) => (
          <div
            key={c.weekIndex}
            title={`Week of ${c.startISO} — ${c.count}/${memberCount} free`}
            className={`rounded-md px-1 py-2 text-center text-[11px] leading-tight ${
              c.isOverlap ? "ring-2 ring-emerald-500 ring-offset-1" : ""
            }`}
            style={{
              backgroundColor: `rgba(79, 70, 229, ${0.08 + c.intensity * 0.85})`,
              color: c.intensity > 0.5 ? "white" : "#475569",
            }}
          >
            <div>{friendlyDate(c.startISO)}</div>
            <div className="text-[10px] opacity-80">
              {c.count}/{memberCount}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        {overlapCount > 0 ? (
          <>
            <span className="font-medium text-emerald-600">{overlapCount}</span> week
            {overlapCount === 1 ? "" : "s"} work for everyone (ringed in green).
          </>
        ) : (
          <>No week works for everyone yet — keep painting!</>
        )}
      </p>
    </div>
  );
}

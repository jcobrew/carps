import { AIRPORT_LABELS } from "../../lib/airports";

export interface RosterEntry {
  userId: string;
  name: string;
  isYou: boolean;
  isOwner: boolean;
  homeAirport: string | null;
  budget: number | null;
  paintedWeeks: number;
}

/** "Who's here" panel — drives social momentum: who joined, who's set up. */
export default function MemberRoster({ entries }: { entries: RosterEntry[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((e) => {
        const ready = e.homeAirport && e.budget != null;
        return (
          <li key={e.userId} className="flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{e.name}</span>
                {e.isYou && (
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                    you
                  </span>
                )}
                {e.isOwner && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    organizer
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {e.homeAirport ? AIRPORT_LABELS[e.homeAirport] ?? e.homeAirport : "no airport yet"}
                {" · "}
                {e.budget != null ? `$${e.budget} budget` : "no budget yet"}
                {" · "}
                {e.paintedWeeks} week{e.paintedWeeks === 1 ? "" : "s"} painted
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {ready ? "ready" : "setting up"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

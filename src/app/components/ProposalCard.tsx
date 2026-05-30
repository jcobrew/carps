import { friendlyRange } from "../../lib/week";
import ReactionControls from "./ReactionControls";

export interface ReactionView {
  userId: string;
  name: string;
  kind: "accept" | "suggest";
  comment: string | null;
}

export interface MemberInfo {
  name: string;
  budget: number | null;
}

/** One ranked proposal: destination, dates, fairness rationale, costs, reactions. */
export default function ProposalCard({
  rank,
  destinationName,
  startDate,
  endDate,
  rationale,
  totalCost,
  perMemberCost,
  members,
  reactions,
  myReaction,
  reactAction,
}: {
  rank: number;
  destinationName: string;
  startDate: string;
  endDate: string;
  rationale: string;
  totalCost: number;
  perMemberCost: Record<string, number>;
  members: Record<string, MemberInfo>;
  reactions: ReactionView[];
  myReaction: { kind: "accept" | "suggest"; comment: string | null } | null;
  reactAction: (kind: "accept" | "suggest", comment?: string) => Promise<{ error?: string }>;
}) {
  const accepts = reactions.filter((r) => r.kind === "accept");
  const suggests = reactions.filter((r) => r.kind === "suggest");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {rank}
            </span>
            <h3 className="text-lg font-semibold">{destinationName}</h3>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{friendlyRange(startDate, endDate)}</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>group total</div>
          <div className="text-sm font-semibold text-slate-700">${totalCost}</div>
        </div>
      </div>

      {/* The rationale sentence — the heart of the product. */}
      <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
        {rationale}
      </p>

      <div className="mt-4">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {Object.entries(perMemberCost).map(([userId, cost]) => {
              const info = members[userId];
              const pct = info?.budget ? Math.round((cost / info.budget) * 100) : null;
              return (
                <tr key={userId}>
                  <td className="py-1.5 text-slate-600">{info?.name ?? userId}</td>
                  <td className="py-1.5 text-right font-medium">${cost}</td>
                  <td className="py-1.5 pl-3 text-right text-xs text-slate-400">
                    {pct != null ? `${pct}% of budget` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reactions from the group */}
      {(accepts.length > 0 || suggests.length > 0) && (
        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
          {accepts.length > 0 && (
            <p className="text-emerald-700">
              ✓ Accepted by {accepts.map((r) => r.name).join(", ")}
            </p>
          )}
          {suggests.map((r) => (
            <p key={r.userId} className="text-amber-700">
              ✎ <span className="font-medium">{r.name}</span>
              {r.comment ? `: ${r.comment}` : " suggested a change"}
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3">
        <ReactionControls
          action={reactAction}
          myKind={myReaction?.kind ?? null}
          myComment={myReaction?.comment ?? null}
        />
      </div>
    </div>
  );
}

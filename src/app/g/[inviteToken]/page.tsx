import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "../../../lib/identity";
import {
  findGroupByInvite,
  listMembers,
  getGroupPaints,
  getLatestRun,
  listReactions,
} from "../../../db/queries";
import { getBaseUrl } from "../../../lib/baseUrl";
import { weekCountBetween } from "../../../lib/week";
import { buildHeatmap } from "../../../lib/availability";
import { setInputsAction, joinExistingAction } from "../../../actions/membership";
import { paintWeekAction } from "../../../actions/availability";
import { findTripAction } from "../../../actions/proposals";
import { reactAction } from "../../../actions/reactions";
import CopyLink from "../../components/CopyLink";
import InputsForm from "../../components/InputsForm";
import WeekCalendar from "../../components/WeekCalendar";
import OverlapHeatmap from "../../components/OverlapHeatmap";
import MemberRoster, { type RosterEntry } from "../../components/MemberRoster";
import RunTripButton from "../../components/RunTripButton";
import ProposalCard, { type ReactionView } from "../../components/ProposalCard";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ inviteToken: string }>;
}) {
  const { inviteToken } = await params;
  const group = await findGroupByInvite(inviteToken);
  if (!group) notFound();

  const me = await currentUser();
  const base = await getBaseUrl();
  const inviteUrl = `${base}/g/${inviteToken}`;

  // Not signed in: send them through the join flow.
  if (!me) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
        <p className="text-sm text-slate-600">
          You&apos;ve been invited to plan a trip. Join to add your airport, budget,
          and availability.
        </p>
        <Link
          href={`/g/${inviteToken}/join`}
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Join this group
        </Link>
      </div>
    );
  }

  const members = await listMembers(group.id);
  const myMembership = members.find((m) => m.user.id === me.id);

  // Signed in but not yet a member: one-click join (no re-entry needed).
  if (!myMembership) {
    const join = joinExistingAction.bind(null, inviteToken);
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
        <p className="text-sm text-slate-600">
          You&apos;re signed in as {me.name}. Join this group to take part.
        </p>
        <form action={join}>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Join this group
          </button>
        </form>
      </div>
    );
  }

  const weekCount = weekCountBetween(group.windowStart, group.windowEnd);
  const paints = await getGroupPaints(members.map((m) => m.membership.id));
  const myWeeks = paints[myMembership.membership.id] ?? [];

  const heatmap = buildHeatmap(
    members.map((m) => paints[m.membership.id] ?? []),
    weekCount,
    group.windowStart,
  );

  const roster: RosterEntry[] = members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    isYou: m.user.id === me.id,
    isOwner: m.user.id === group.createdById,
    homeAirport: m.membership.homeAirport,
    budget: m.membership.budget,
    paintedWeeks: (paints[m.membership.id] ?? []).length,
  }));

  // Latest convergence run (proposals or a friendly failure).
  const runRows = await getLatestRun(group.id);
  const failureRow = runRows.find((r) => r.rank === 0 && r.failureReason);
  const proposalRows = runRows.filter((r) => r.rank >= 1);
  const reactionViews = await listReactions(proposalRows.map((r) => r.id));
  const memberInfo = Object.fromEntries(
    members.map((m) => [m.user.id, { name: m.user.name, budget: m.membership.budget }]),
  );

  const setInputs = setInputsAction.bind(null, inviteToken, group.id);
  const paint = paintWeekAction.bind(null, inviteToken, group.id);
  const findTrip = findTripAction.bind(null, inviteToken, group.id);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
        <div className="max-w-xl">
          <CopyLink label="Invite link — share with friends" url={inviteUrl} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Who's here */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 font-medium">Who&apos;s here ({members.length})</h2>
          <MemberRoster entries={roster} />
        </section>

        {/* My inputs */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-medium">Your trip inputs</h2>
          <InputsForm
            action={setInputs}
            currentAirport={myMembership.membership.homeAirport}
            currentBudget={myMembership.membership.budget}
          />
        </section>
      </div>

      {/* Availability */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-medium">Your availability</h2>
        <WeekCalendar
          weekCount={weekCount}
          windowStartMs={group.windowStart}
          initialWeeks={myWeeks}
          action={paint}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-medium">Everyone&apos;s availability</h2>
        <OverlapHeatmap cells={heatmap} memberCount={members.length} />
      </section>

      {/* Convergence */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">The proposal</h2>
          <RunTripButton action={findTrip} hasRun={runRows.length > 0} />
        </div>

        {runRows.length === 0 && (
          <p className="text-sm text-slate-500">
            Once everyone&apos;s set their airport, budget, and availability, hit
            <span className="font-medium"> Find us a trip</span> to see fair proposals.
          </p>
        )}

        {failureRow && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {failureRow.failureReason}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proposalRows.map((p) => {
            const perMemberCost: Record<string, number> = p.perMemberCost
              ? JSON.parse(p.perMemberCost)
              : {};
            const reactions: ReactionView[] = reactionViews
              .filter((r) => r.reaction.proposalId === p.id)
              .map((r) => ({
                userId: r.user.id,
                name: r.user.name,
                kind: r.reaction.kind as "accept" | "suggest",
                comment: r.reaction.comment,
              }));
            const mine = reactions.find((r) => r.userId === me.id);
            return (
              <ProposalCard
                key={p.id}
                rank={p.rank}
                destinationName={p.destinationName ?? "Somewhere"}
                startDate={p.startDate ?? ""}
                endDate={p.endDate ?? ""}
                rationale={p.rationale ?? ""}
                totalCost={p.totalCost ?? 0}
                perMemberCost={perMemberCost}
                members={memberInfo}
                reactions={reactions}
                myReaction={mine ? { kind: mine.kind, comment: mine.comment } : null}
                reactAction={reactAction.bind(null, inviteToken, p.id)}
              />
            );
          })}
        </div>
      </section>

      <p className="text-center text-xs text-slate-400">
        Refresh anytime to see who&apos;s joined, who&apos;s set up, and the latest proposals.
        Nothing here is ever booked.
      </p>
    </div>
  );
}

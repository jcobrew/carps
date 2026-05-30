import { redirect } from "next/navigation";
import { createGroupAction } from "../../../actions/groups";
import { currentUser } from "../../../lib/identity";

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await currentUser();
  if (!me) redirect("/");
  const { error } = await searchParams;

  // Default the window start to ~6 months out (trips are planned ~1 year ahead;
  // a 6-month window from then is a sensible coarse default the creator can edit).
  // This is a per-request Server Component render, so reading the clock is fine.
  // eslint-disable-next-line react-hooks/purity
  const defaultStart = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="max-w-md space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Start a trip group</h1>
        <p className="text-sm text-slate-600">
          Pick a name and roughly when the ~6-month planning window should begin.
          You&apos;ll get an invite link to share next.
        </p>
      </div>

      <form
        action={createGroupAction}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
      >
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="name">Group name</label>
          <input
            id="name" name="name" required maxLength={80}
            placeholder="Reunion 2027"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="startDate">
            Planning window starts around
          </label>
          <input
            id="startDate" name="startDate" type="date" required defaultValue={defaultStart}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <p className="text-xs text-slate-400">
            We&apos;ll create 26 weeks of paintable availability from the Monday on or after this date.
          </p>
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Create group &amp; get invite link
        </button>
      </form>
    </div>
  );
}

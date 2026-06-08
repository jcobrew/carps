import { notFound } from "next/navigation";
import { joinGroupAction } from "../../../../actions/membership";
import { findGroupByInvite } from "../../../../db/queries";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ inviteToken: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { inviteToken } = await params;
  const { error } = await searchParams;
  const group = await findGroupByInvite(inviteToken);
  if (!group) notFound();

  const join = joinGroupAction.bind(null, inviteToken);

  return (
    <div className="max-w-md space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Join &ldquo;{group.name}&rdquo;
        </h1>
        <p className="text-sm text-slate-600">
          Add your name and email to join the group. No password — you&apos;ll get a
          private link that&apos;s your identity.
        </p>
      </div>

      <form action={join} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="name">Name</label>
          <input
            id="name" name="name" required maxLength={80}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email" name="email" type="email" required maxLength={200}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Join group
        </button>
      </form>
    </div>
  );
}

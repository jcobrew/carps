import Link from "next/link";
import { notFound } from "next/navigation";
import { userFromToken } from "../../../lib/identity";
import { listGroupsForUser } from "../../../db/queries";
import { getBaseUrl } from "../../../lib/baseUrl";
import CopyLink from "../../components/CopyLink";

/**
 * The user's coat-check page. The token in the URL IS the identity; visiting it
 * also refreshes the identity cookie so the rest of the app knows who you are.
 */
export default async function MePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const me = await userFromToken(token);
  if (!me) notFound();

  // Identity cookie is set by middleware on this route (cookies can't be written
  // during a Server Component render).
  const groups = await listGroupsForUser(me.id);
  const base = await getBaseUrl();

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Hi {me.name} 👋</h1>
        <p className="text-sm text-slate-600">
          This is your private page. Bookmark it — the link is how we know it&apos;s you.
        </p>
        <div className="max-w-xl pt-2">
          <CopyLink label="Your personal link" url={`${base}/me/${me.token}`} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Your trip groups</h2>
          <Link
            href="/groups/new"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + New group
          </Link>
        </div>

        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No groups yet. Create one and share the invite link with your friends.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/g/${g.inviteToken}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <span className="font-medium">{g.name}</span>
                  <span className="text-xs text-slate-400">open →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { signUpAction } from "../actions/users";
import { currentUser } from "../lib/identity";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const me = await currentUser();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Find a trip that&apos;s fair to everyone.
        </h1>
        <p className="max-w-xl text-slate-600">
          You and your scattered friends each add a home airport, a budget, and the weeks
          you&apos;re free. Convergence proposes a shared destination and dates where the
          burden lands as evenly as possible — and shows you exactly why.
        </p>
      </section>

      {me ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">
            You&apos;re signed in as <span className="font-medium">{me.name}</span>.
          </p>
          <Link
            href={`/me/${me.token}`}
            className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Go to your groups →
          </Link>
        </div>
      ) : (
        <form
          action={signUpAction}
          className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 className="font-medium">Get your personal link</h2>
          <p className="text-xs text-slate-500">
            No password. We give you a private URL that is your identity — bookmark it.
          </p>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="name">Name</label>
            <input
              id="name" name="name" required maxLength={80}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Maria"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email" required maxLength={200}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="maria@example.com"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Continue
          </button>
        </form>
      )}

      <p className="text-xs text-slate-400">
        Prototype for testing with friends — nothing is ever booked and no money moves.
      </p>
    </div>
  );
}

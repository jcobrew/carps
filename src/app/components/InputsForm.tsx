"use client";

import { useActionState } from "react";
import { AIRPORTS } from "../../lib/airports";

type Result = { error?: string };
type BoundAction = (formData: FormData) => Promise<Result>;

/** Per-member airport + budget editor. The action is pre-bound on the server. */
export default function InputsForm({
  action,
  currentAirport,
  currentBudget,
}: {
  action: BoundAction;
  currentAirport: string | null;
  currentBudget: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: Result, formData: FormData) => action(formData),
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500" htmlFor="homeAirport">
            Home airport
          </label>
          <select
            id="homeAirport"
            name="homeAirport"
            defaultValue={currentAirport ?? ""}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="" disabled>
              Select…
            </option>
            {AIRPORTS.map((a) => (
              <option key={a.code} value={a.code}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500" htmlFor="budget">
            Budget ceiling (USD)
          </label>
          <input
            id="budget"
            name="budget"
            type="number"
            min={1}
            step={50}
            required
            defaultValue={currentBudget ?? ""}
            placeholder="1500"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save my airport & budget"}
      </button>
    </form>
  );
}

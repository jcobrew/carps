"use client";

import { useState, useTransition } from "react";

/** Manual convergence trigger. Runs the fairness engine on the server. */
export default function RunTripButton({
  action,
  hasRun,
}: {
  action: () => Promise<{ error?: string }>;
  hasRun: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await action();
            if (res.error) setError(res.error);
          })
        }
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Converging…" : hasRun ? "Re-run · Find us a trip" : "Find us a trip"}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

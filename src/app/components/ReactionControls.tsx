"use client";

import { useState, useTransition } from "react";

type ReactAction = (
  kind: "accept" | "suggest",
  comment?: string,
) => Promise<{ error?: string }>;

/** Accept or Suggest-a-change controls for the current user on one proposal. */
export default function ReactionControls({
  action,
  myKind,
  myComment,
}: {
  action: ReactAction;
  myKind: "accept" | "suggest" | null;
  myComment: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [showSuggest, setShowSuggest] = useState(myKind === "suggest");
  const [comment, setComment] = useState(myComment ?? "");
  const [error, setError] = useState<string | null>(null);

  function send(kind: "accept" | "suggest", note?: string) {
    setError(null);
    startTransition(async () => {
      const res = await action(kind, note);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setShowSuggest(false);
            send("accept");
          }}
          disabled={pending}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
            myKind === "accept"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          {myKind === "accept" ? "✓ You accepted" : "Accept"}
        </button>
        <button
          onClick={() => setShowSuggest((s) => !s)}
          disabled={pending}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
            myKind === "suggest"
              ? "bg-amber-500 text-white"
              : "border border-amber-500 text-amber-700 hover:bg-amber-50"
          }`}
        >
          {myKind === "suggest" ? "✎ Change suggested" : "Suggest a change"}
        </button>
      </div>

      {showSuggest && (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="What would make this work better for you?"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={() => send("suggest", comment)}
            disabled={pending || comment.trim().length === 0}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Send suggestion"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

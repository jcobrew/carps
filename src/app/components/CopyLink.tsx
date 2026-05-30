"use client";

import { useState } from "react";

/** A read-only field showing a shareable URL with a one-click copy button. */
export default function CopyLink({ url, label }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; the field is selectable as a fallback.
    }
  }

  return (
    <div className="space-y-1">
      {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
        />
        <button
          onClick={copy}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-100"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

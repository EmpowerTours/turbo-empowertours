"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Show the signed-in wallet address.
//
// This exists because the address was derivable but never displayed. The same
// passkey derives the SAME address in Hunt and here (see lib/auth/mera-wallet.tsx),
// which is the whole mechanism linking a hunter's TURBO credit to their cohort
// subscription — but a member could not read their own address, so they could
// not prove which account was theirs, and nobody settling a redemption by hand
// could verify the match.
//
// Copy yields the FULL address, never the truncated form. Settlement is manual
// (TurboCohort exposes only payMonthly(uint8), which pays for msg.sender, so
// there is no pay-on-behalf entry point) and a human pasting a truncated address
// into a spreadsheet is how the wrong person gets a month.
// ---------------------------------------------------------------------------

export function WalletBadge({ address }: { address?: string }) {
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard is unavailable over plain http and in some mobile webviews.
      // Say so rather than showing a success state that did not happen.
      setCopied(false);
      window.prompt("Copy your wallet address:", address);
    }
  }

  return (
    <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="syne text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">
            Your wallet
          </div>
          {/* Truncated for the eye, full string in the title and in the clipboard. */}
          <div
            className="font-mono text-sm text-white break-all"
            title={address}
          >
            {short}
          </div>
        </div>
        <button
          onClick={() => void copy()}
          className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-semibold shrink-0"
          aria-label="Copy full wallet address"
        >
          {copied ? "Copied" : "Copy address"}
        </button>
      </div>
      <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
        This is the same wallet you use in EmpowerTours Hunt. Credit earned from
        cache finds is redeemed against this address.
      </p>
    </div>
  );
}

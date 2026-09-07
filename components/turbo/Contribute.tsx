"use client";

import { useState } from "react";
import { createWalletClient, http, parseEther } from "viem";
import { monad } from "@/lib/monad";
import { useMeraWallet } from "@/lib/auth/mera-wallet";
import { TURBO_TREASURY_ADDRESS } from "@/lib/contracts";

// A hunter's voluntary contribution toward TURBO — a plain native-MON send to
// the cohort treasury. Optional, ungated: nothing unlocks or locks, it just
// lets a hunter who wants to become a developer chip in what they can while
// doing homework. No membership, no approval, no wrapping — one signature.

const PRESETS = ["1", "5", "10"];

export default function Contribute() {
  const mera = useMeraWallet();
  const [amount, setAmount] = useState("1");
  const [phase, setPhase] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const account = mera.account;
  // Only offered to passkey hunters (a Privy member pays dues the normal way).
  if (!mera.address || !account) return null;

  async function contribute() {
    setErr(null);
    let value: bigint;
    try {
      value = parseEther(amount || "0");
    } catch {
      setErr("Enter a valid amount");
      return;
    }
    if (value <= 0n) {
      setErr("Enter an amount");
      return;
    }
    setPhase("sending");
    try {
      const wc = createWalletClient({
        account,
        chain: monad,
        transport: http(),
      });
      const hash = await wc.sendTransaction({
        account,
        chain: monad,
        to: TURBO_TREASURY_ADDRESS,
        value,
      });
      setTx(hash);
      setPhase("done");
    } catch (e) {
      const m = e as { shortMessage?: string; message?: string };
      setErr(m?.shortMessage ?? m?.message ?? "Contribution failed");
      setPhase("error");
    }
  }

  return (
    <div className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
      <div className="syne text-sm font-bold text-white mb-1">
        Support TURBO{" "}
        <span className="font-normal text-zinc-500">· optional</span>
      </div>
      <p className="text-zinc-500 text-[12px] mb-4">
        Chip in some MON toward your journey — completely voluntary. Nothing is
        locked or gated; you can keep learning either way.
      </p>

      {phase === "done" ? (
        <div className="text-[13px] text-cyan-400">
          Thank you — contribution sent.
          {tx && (
            <a
              href={`https://monadscan.com/tx/${tx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-2"
            >
              view
            </a>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                className="px-3 py-1.5 rounded-lg border text-[12px] syne font-semibold transition-colors"
                style={{
                  borderColor: amount === p ? "#06b6d4" : "rgba(63,63,70,0.4)",
                  color: amount === p ? "#06b6d4" : "#a1a1aa",
                }}
              >
                {p} MON
              </button>
            ))}
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^0-9.]/g, ""))
              }
              className="w-24 px-2 py-1.5 rounded-lg border border-zinc-700 bg-transparent text-white text-[12px]"
              aria-label="Custom MON amount"
            />
          </div>
          {err && <p className="text-red-400 text-[12px] mb-2">{err}</p>}
          <button
            onClick={() => void contribute()}
            disabled={phase === "sending"}
            className="cta-primary text-[13px]"
          >
            {phase === "sending"
              ? "Sending…"
              : `Contribute ${amount || "0"} MON`}
          </button>
        </>
      )}
    </div>
  );
}

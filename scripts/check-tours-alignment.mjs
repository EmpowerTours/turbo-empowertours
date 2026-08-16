#!/usr/bin/env node
/**
 * Asserts TURBO and fcempowertours point at the same TOURS token.
 *
 * TURBO hardcodes the address in lib/contracts.ts; fcempowertours resolves it
 * from env at runtime. That asymmetry is deliberate — a const can't be broken
 * by a mistyped Railway variable — but it means the two can silently drift.
 * This check is the thing that notices.
 *
 * Reads the *deployed* fcempowertours config, not its .env: the local file has
 * been out of sync with Railway before.
 *
 *   node scripts/check-tours-alignment.mjs
 *
 * Exits 0 when aligned, 1 on mismatch, 2 if the peer app can't be reached.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACTS = resolve(HERE, "../lib/contracts.ts");
const PEER =
  process.env.FC_CONFIG_CHECK_URL ??
  "https://fcempowertours-production-6551.up.railway.app/api/config-check";
const EXPECTED_CHAIN_ID = 143; // Monad mainnet

async function turboToursAddress() {
  const src = await readFile(CONTRACTS, "utf8");
  const match = src.match(/TOURS_TOKEN_ADDRESS\s*=\s*'(0x[a-fA-F0-9]{40})'/);
  if (!match) throw new Error(`TOURS_TOKEN_ADDRESS not found in ${CONTRACTS}`);
  return match[1];
}

async function peerConfig() {
  const res = await fetch(PEER, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${PEER} returned HTTP ${res.status}`);
  return res.json();
}

const fail = (msg) => {
  console.error(`FAIL  ${msg}`);
  process.exitCode = 1;
};

let peer;
const turbo = await turboToursAddress();

try {
  peer = await peerConfig();
} catch (err) {
  console.error(`UNREACHABLE  ${PEER}\n             ${err.message}`);
  console.error(
    "\nCannot prove alignment. Treat as unverified, not as passing.",
  );
  process.exit(2);
}

console.log(`TURBO            ${turbo}   (lib/contracts.ts)`);
console.log(
  `fcempowertours   ${peer?.env?.toursToken ?? "(absent)"}   (deployed runtime)`,
);
console.log("");

if (!peer?.env?.toursToken) {
  fail("fcempowertours config-check did not report env.toursToken");
} else if (turbo.toLowerCase() !== peer.env.toursToken.toLowerCase()) {
  fail("TOURS token addresses differ — the two apps are on separate tokens");
} else {
  console.log("OK    both apps use the same TOURS token");
}

if (peer?.chainId !== EXPECTED_CHAIN_ID) {
  fail(
    `fcempowertours reports chainId ${peer?.chainId}, expected ${EXPECTED_CHAIN_ID}`,
  );
} else {
  console.log(`OK    fcempowertours on chainId ${EXPECTED_CHAIN_ID}`);
}

// A green config-check on the peer is part of the invariant: it is what proves
// the reward manager pays this same token rather than a deprecated version.
const failing = peer?.failing ?? [];
if (failing.length > 0) {
  fail(`fcempowertours reports ${failing.length} failing check(s):`);
  for (const f of failing)
    console.error(`      - ${f.name}: ${f.detail ?? ""}`);
} else {
  console.log("OK    fcempowertours reports no failing config checks");
}

if (process.exitCode === 1) {
  console.error(
    "\nTOURS alignment broken. Do not ship reward changes until resolved.",
  );
} else {
  console.log("\nTOURS alignment verified.");
}

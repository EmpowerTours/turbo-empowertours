import {
  evaluateClaim,
  MAX_SCHOLARSHIPS,
  type ClaimContext,
} from "@/lib/hunt/claim";
import { getSpawn, localHour, distanceMeters } from "@/lib/hunt/spawns";

const centro = getSpawn("centro")!;

// Mexico City is UTC-6 year round (no DST since 2022).
const NOON_LOCAL = new Date("2026-08-15T18:00:00Z"); // 12:00
const MIDNIGHT_LOCAL = new Date("2026-08-15T06:00:00Z"); // 00:00

const base: ClaimContext = {
  spawn: centro,
  position: { lat: centro.lat, lon: centro.lon, accuracy: 20 },
  now: NOON_LOCAL,
  personHasClaimed: false,
  spawnClaimsUsed: 0,
  totalClaimsUsed: 0,
};

const cases: Array<[string, ClaimContext, string]> = [
  ["standing on it", base, "ok"],
  [
    "edge of radius",
    {
      ...base,
      position: { lat: centro.lat + 0.001, lon: centro.lon, accuracy: 20 },
    },
    "ok",
  ],
  [
    "NaN coords",
    { ...base, position: { lat: NaN, lon: 0, accuracy: 10 } },
    "bad-coordinates",
  ],
  [
    "budget gone",
    { ...base, totalClaimsUsed: MAX_SCHOLARSHIPS },
    "budget-exhausted",
  ],
  ["second claim", { ...base, personHasClaimed: true }, "already-claimed"],
  [
    "spawn empty",
    { ...base, spawnClaimsUsed: centro.capacity },
    "spawn-exhausted",
  ],
  ["middle of night", { ...base, now: MIDNIGHT_LOCAL }, "spawn-inactive"],
  [
    "fix too loose",
    { ...base, position: { lat: centro.lat, lon: centro.lon, accuracy: 500 } },
    "poor-accuracy",
  ],
  [
    "a km away",
    {
      ...base,
      position: { lat: centro.lat + 0.01, lon: centro.lon, accuracy: 20 },
    },
    "out-of-range",
  ],
  [
    "teleported from the river",
    {
      ...base,
      lastSeen: {
        lat: 17.1588,
        lon: -99.5309,
        at: NOON_LOCAL.getTime() - 10_000,
      },
    },
    "impossible-travel",
  ],
  [
    "walked from the river",
    {
      ...base,
      lastSeen: {
        lat: 17.1588,
        lon: -99.5309,
        at: NOON_LOCAL.getTime() - 600_000,
      },
    },
    "ok",
  ],
];

let failures = 0;
console.log(`local hour at NOON_LOCAL = ${localHour(NOON_LOCAL)} (expect 12)`);
console.log(
  `local hour at MIDNIGHT_LOCAL = ${localHour(MIDNIGHT_LOCAL)} (expect 0)`,
);
console.log(
  `centro <-> rio = ${Math.round(distanceMeters(centro.lat, centro.lon, 17.1588, -99.5309))}m\n`,
);

for (const [label, ctx, expected] of cases) {
  const v = evaluateClaim(ctx);
  const got = v.ok ? "ok" : v.reason;
  const pass = got === expected;
  if (!pass) failures++;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${label.padEnd(24)} expected=${expected.padEnd(18)} got=${got}`,
  );
  if (!v.ok && !pass) console.log(`      detail: ${v.detail}`);
}

console.log(failures === 0 ? "\nall claim rules pass" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);

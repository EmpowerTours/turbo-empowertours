import {
  appendSample,
  averagePosition,
  fixQuality,
  isUsableSample,
  slugify,
  toSpawnSource,
  MAX_SAMPLES,
  MAX_SURVEY_ACCURACY_METERS,
  SAMPLE_TTL_MS,
  type Capture,
  type Sample,
} from "@/lib/hunt/survey";
import { distanceMeters } from "@/lib/hunt/spawns";

const T0 = new Date("2026-08-15T18:00:00Z").getTime();
const SPOT = { lat: 17.1614, lon: -99.5283 };

let failures = 0;
function check(label: string, pass: boolean, detail = "") {
  if (!pass) failures++;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`,
  );
}

const s = (
  dLat: number,
  dLon: number,
  accuracy: number,
  tOffsetMs = 0,
): Sample => ({
  lat: SPOT.lat + dLat,
  lon: SPOT.lon + dLon,
  accuracy,
  at: T0 + tOffsetMs,
});

/* ── sample filtering ── */

check(
  "rejects a loose fix",
  !isUsableSample(s(0, 0, MAX_SURVEY_ACCURACY_METERS + 1)),
);
check("accepts a tight fix", isUsableSample(s(0, 0, 8)));
check(
  "rejects NaN",
  !isUsableSample({ lat: NaN, lon: 0, accuracy: 5, at: T0 }),
);
check("rejects zero accuracy", !isUsableSample(s(0, 0, 0)));

/* ── averaging ── */

check("no samples means no fix", averagePosition([]) === null);

const symmetric = averagePosition([s(-0.0001, 0, 10), s(0.0001, 0, 10)])!;
check(
  "equal weights average to the midpoint",
  Math.abs(symmetric.lat - SPOT.lat) < 1e-9,
  `lat off by ${((symmetric.lat - SPOT.lat) * 111000).toExponential(2)}m`,
);

// A 5m fix carries 1/25 weight, a 50m fix 1/2500 — a hundred to one. The mean
// should sit within ~1% of the tight reading, not halfway.
const weighted = averagePosition([s(0, 0, 5), s(0.001, 0, 50)])!;
const pulledFraction = (weighted.lat - SPOT.lat) / 0.001;
check(
  "a tight fix outweighs a loose one 100:1",
  pulledFraction < 0.02,
  `moved ${(pulledFraction * 100).toFixed(2)}% toward the loose reading`,
);

const spreadFix = averagePosition([s(0, 0, 10), s(0.0009, 0, 10)])!;
check(
  "spread reports the real disagreement",
  Math.round(spreadFix.spreadMeters) === 50,
  `${spreadFix.spreadMeters.toFixed(1)}m (expect ~50m)`,
);
check(
  "best accuracy is the tightest reading",
  averagePosition([s(0, 0, 30), s(0, 0, 7)])!.bestAccuracyMeters === 7,
);
check(
  "loose readings are excluded from the mean",
  averagePosition([s(0, 0, 9), s(0.01, 0, 500)])!.samples === 1,
);

/* ── quality gate ── */

const eight = Array.from({ length: 8 }, (_, i) => s(0, 0, 10, i * 1000));
check(
  "eight tight readings settle",
  fixQuality(averagePosition(eight)) === "good",
);
check(
  "too few readings still waiting",
  fixQuality(averagePosition(eight.slice(0, 3))) === "waiting",
);
const scattered = Array.from({ length: 8 }, (_, i) =>
  s(i * 0.0002, 0, 10, i * 1000),
);
check(
  "scattered readings read rough",
  fixQuality(averagePosition(scattered)) === "rough",
);

/* ── buffer discipline ── */

let buf: Sample[] = [];
for (const x of eight) buf = appendSample(buf, x);
check("buffer collects", buf.length === 8);

const walkedOff = appendSample(buf, s(0.002, 0, 10, 9000)); // ~222m away
check(
  "walking off resets the buffer",
  walkedOff.length === 1,
  `kept ${walkedOff.length}`,
);
check(
  "reset keeps the new spot, not the old",
  distanceMeters(walkedOff[0].lat, walkedOff[0].lon, SPOT.lat, SPOT.lon) > 200,
);

const stale = appendSample(buf, s(0, 0, 10, SAMPLE_TTL_MS + 10_000));
check("stale readings expire", stale.length === 1, `kept ${stale.length}`);

let big: Sample[] = [];
for (let i = 0; i < MAX_SAMPLES + 40; i++)
  big = appendSample(big, s(0, 0, 10, i * 100));
check("buffer is bounded", big.length === MAX_SAMPLES, `${big.length}`);

check(
  "unusable readings never enter the buffer",
  appendSample(buf, s(0, 0, 900)).length === 8,
);

/* ── slugs ── */

check("strips accents", slugify("El Río") === "el-rio", slugify("El Río"));
check(
  "collapses punctuation",
  slugify("  La Plaza — Norte!! ") === "la-plaza-norte",
  slugify("  La Plaza — Norte!! "),
);
check("never returns empty", slugify("!!!") === "spawn", slugify("!!!"));

/* ── export ── */

const capture: Capture = {
  id: "el-rio",
  name: 'El "Río"',
  hint: "Down where the water runs.",
  lat: 17.158812,
  lon: -99.530911,
  radiusMeters: 150,
  activeHours: [9, 17],
  capacity: 30,
  surveyedAt: "2026-08-15T18:00:00.000Z",
  samples: 14,
  spreadMeters: 6.4,
  bestAccuracyMeters: 5,
};

const src = toSpawnSource([capture]);
check("empty export says so", toSpawnSource([]).startsWith("//"));
check(
  "emits the SPAWNS array",
  src.includes("export const SPAWNS: readonly Spawn[] = ["),
);
check(
  "escapes quotes in names",
  src.includes('"El \\"Río\\""'),
  src.split("\n")[2],
);
check(
  "keeps six decimals",
  src.includes("lat: 17.158812") && src.includes("lon: -99.530911"),
);
check("emits the hours tuple", src.includes("activeHours: [9, 17]"));
check(
  "records the evidence",
  src.includes("14 samples, 6m spread, best fix 5m"),
);

console.log(
  failures === 0 ? "\nall survey math passes" : `\n${failures} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);

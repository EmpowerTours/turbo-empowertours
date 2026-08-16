import { distanceMeters, type Spawn } from "@/lib/hunt/spawns";

/**
 * Turning a phone standing in a field into a spawn coordinate.
 *
 * A single GPS fix is not a location, it is a guess with a radius. Standing
 * still and taking many fixes gets closer to the truth, so the survey page
 * records a stream of readings and this module condenses them.
 *
 * Kept free of React and the browser so the arithmetic can be tested without a
 * phone, which matters because a quiet bug here silently misplaces every spawn
 * in the village and nobody finds out until people are walking around in the
 * wrong street.
 */

/**
 * Readings looser than this are not worth averaging in. Deliberately stricter
 * than the claim path's 200m: a player is walking past and takes what they get,
 * a surveyor is standing still and can afford to wait for a better fix.
 */
export const MAX_SURVEY_ACCURACY_METERS = 60;

/** Enough readings to see whether they agree. Below this the spread is noise. */
export const MIN_SAMPLES_FOR_FIX = 8;

/** Readings that agree this closely mean the receiver has settled. */
export const GOOD_SPREAD_METERS = 15;

export interface Sample {
  readonly lat: number;
  readonly lon: number;
  /** Metres, the browser's 68% confidence radius. */
  readonly accuracy: number;
  /** Epoch milliseconds. */
  readonly at: number;
}

export interface SurveyFix {
  readonly lat: number;
  readonly lon: number;
  /** How many readings went into the mean. */
  readonly samples: number;
  /** The tightest single reading. */
  readonly bestAccuracyMeters: number;
  /** Furthest any reading sits from the mean — how much they disagree. */
  readonly spreadMeters: number;
}

export function isUsableSample(s: Sample): boolean {
  return (
    Number.isFinite(s.lat) &&
    Number.isFinite(s.lon) &&
    Math.abs(s.lat) <= 90 &&
    Math.abs(s.lon) <= 180 &&
    Number.isFinite(s.accuracy) &&
    s.accuracy > 0 &&
    s.accuracy <= MAX_SURVEY_ACCURACY_METERS
  );
}

/**
 * Weighted mean of the usable readings, weighting each by 1/accuracy² so a 5m
 * fix counts a hundred times a 50m one.
 *
 * Two honest limits. The mean is arithmetic, which is only valid because Tierra
 * Colorada is nowhere near a pole or the antimeridian — this is not a general
 * geodesic mean. And the spread is reported instead of a combined error bar
 * because consecutive fixes from one receiver share the same multipath bias;
 * they are not independent, so the usual 1/sqrt(n) improvement would be a lie.
 * Tight spread means the receiver settled, not that the answer is correct.
 */
export function averagePosition(samples: readonly Sample[]): SurveyFix | null {
  const usable = samples.filter(isUsableSample);
  if (usable.length === 0) return null;

  let weightSum = 0;
  let latSum = 0;
  let lonSum = 0;

  for (const s of usable) {
    // Floor the accuracy so an optimistic 0.5m reading cannot dominate.
    const sigma = Math.max(s.accuracy, 1);
    const w = 1 / (sigma * sigma);
    weightSum += w;
    latSum += s.lat * w;
    lonSum += s.lon * w;
  }

  const lat = latSum / weightSum;
  const lon = lonSum / weightSum;

  let spread = 0;
  for (const s of usable) {
    const d = distanceMeters(lat, lon, s.lat, s.lon);
    if (d > spread) spread = d;
  }

  return {
    lat,
    lon,
    samples: usable.length,
    bestAccuracyMeters: Math.min(...usable.map((s) => s.accuracy)),
    spreadMeters: spread,
  };
}

/** A reading this far from the running mean means the surveyor walked off. */
export const MOVED_AWAY_METERS = 100;

/** Readings older than this are from a previous stop, not this one. */
export const SAMPLE_TTL_MS = 3 * 60 * 1000;

/** Bounds the buffer on a page left open all afternoon. */
export const MAX_SAMPLES = 120;

/**
 * Add a reading to the buffer.
 *
 * Starts over when the surveyor has plainly moved, because averaging two
 * different street corners produces a confident coordinate for a spot that is
 * neither of them — the worst possible failure here, since it looks fine.
 */
export function appendSample(
  samples: readonly Sample[],
  next: Sample,
): Sample[] {
  if (!isUsableSample(next)) return [...samples];

  const fresh = samples.filter((s) => next.at - s.at <= SAMPLE_TTL_MS);
  const mean = averagePosition(fresh);

  if (
    mean &&
    distanceMeters(mean.lat, mean.lon, next.lat, next.lon) > MOVED_AWAY_METERS
  ) {
    return [next];
  }

  return [...fresh, next].slice(-MAX_SAMPLES);
}

export type FixQuality = "waiting" | "rough" | "good";

export function fixQuality(fix: SurveyFix | null): FixQuality {
  if (!fix || fix.samples < MIN_SAMPLES_FOR_FIX) return "waiting";
  return fix.spreadMeters <= GOOD_SPREAD_METERS ? "good" : "rough";
}

/** `El Río` -> `el-rio`. Stable ids so a re-survey overwrites rather than duplicates. */
export function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      // eslint-disable-next-line no-misleading-character-class -- combining marks, stripped after NFD
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "spawn"
  );
}

/** A surveyed spawn: the table entry plus the evidence behind its coordinates. */
export interface Capture extends Spawn {
  readonly surveyedAt: string;
  readonly samples: number;
  readonly spreadMeters: number;
  readonly bestAccuracyMeters: number;
}

/** Six decimals is ~0.11m — far finer than any phone, and short enough to read. */
function coord(n: number): string {
  return n.toFixed(6);
}

/**
 * Paste-ready replacement for the SPAWNS array. The whole point of the page is
 * producing this, so it emits the real `Spawn` shape rather than a data dump
 * someone has to reshape by hand.
 */
export function toSpawnSource(captures: readonly Capture[]): string {
  if (captures.length === 0) return "// nothing captured yet";

  const entries = captures
    .map((c) => {
      const [open, close] = c.activeHours;
      return `  {
    id: ${JSON.stringify(c.id)},
    name: ${JSON.stringify(c.name)},
    hint: ${JSON.stringify(c.hint)},
    lat: ${coord(c.lat)},
    lon: ${coord(c.lon)},
    radiusMeters: ${c.radiusMeters},
    activeHours: [${open}, ${close}],
    capacity: ${c.capacity},
  }, // surveyed ${c.surveyedAt.slice(0, 10)} — ${c.samples} samples, ${Math.round(c.spreadMeters)}m spread, best fix ${Math.round(c.bestAccuracyMeters)}m`;
    })
    .join("\n");

  return `export const SPAWNS: readonly Spawn[] = [\n${entries}\n] as const;`;
}

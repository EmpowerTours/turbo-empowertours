import { distanceMeters, isSpawnActive, type Spawn } from "@/lib/hunt/spawns";

/**
 * Deterministic claim rules.
 *
 * Deliberately free of Redis and network calls so every branch can be tested
 * without a live chain or database. The route gathers state, this decides.
 *
 * A note on what these checks are and are not. Browser geolocation can be
 * overridden from Chrome's sensor panel in three clicks, so none of this stops
 * a determined spoofer, and it is not trying to. What makes the hunt safe is
 * economic, not geometric: the reward is a tuition credit paid into a soulbound
 * membership, and each person may claim exactly one, ever. Faking fifty
 * positions earns fifty unsellable course enrolments. These rules exist to keep
 * honest play honest and to bound the spend — not to win an arms race.
 */

/** A fix looser than this means the phone does not know where it is. */
export const MAX_ACCURACY_METERS = 200;

/** Faster than a rural bus. Catches casual mock-location use, nothing cleverer. */
export const MAX_TRAVEL_KMH = 120;

/**
 * Hard ceiling on scholarships the hunt will ever fund, denominated in people
 * rather than MON so a price move cannot quietly widen it. 166 is USD 500 at
 * 139 MON per Explorer month. The claim path fails closed on reaching it.
 */
export const MAX_SCHOLARSHIPS = 166;

export type ClaimRejection =
  | "bad-coordinates"
  | "poor-accuracy"
  | "spawn-inactive"
  | "out-of-range"
  | "spawn-exhausted"
  | "already-claimed"
  | "impossible-travel"
  | "budget-exhausted";

export interface Position {
  readonly lat: number;
  readonly lon: number;
  /** Metres, as reported by the browser. */
  readonly accuracy: number;
}

export interface LastSeen {
  readonly lat: number;
  readonly lon: number;
  /** Epoch milliseconds. */
  readonly at: number;
}

export interface ClaimContext {
  readonly spawn: Spawn;
  readonly position: Position;
  readonly now: Date;
  /** Has this person ever been funded? One scholarship per human, for life. */
  readonly personHasClaimed: boolean;
  /** Claims already taken from this spawn. */
  readonly spawnClaimsUsed: number;
  /** Scholarships funded across the whole hunt. */
  readonly totalClaimsUsed: number;
  /** Previous accepted position for this person, if any. */
  readonly lastSeen?: LastSeen;
}

export type ClaimVerdict =
  | { readonly ok: true; readonly distanceMeters: number }
  | {
      readonly ok: false;
      readonly reason: ClaimRejection;
      readonly detail: string;
    };

const reject = (reason: ClaimRejection, detail: string): ClaimVerdict => ({
  ok: false,
  reason,
  detail,
});

function coordinatesAreSane(p: Position): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180 &&
    Number.isFinite(p.accuracy) &&
    p.accuracy >= 0
  );
}

/**
 * Implied ground speed since this person's last accepted position.
 * Returns null when there is nothing to compare against.
 */
export function impliedSpeedKmh(
  from: LastSeen,
  to: Position,
  nowMs: number,
): number | null {
  const elapsedSec = (nowMs - from.at) / 1000;
  const metres = distanceMeters(from.lat, from.lon, to.lat, to.lon);

  // Two fixes at the same instant from different places is teleportation.
  // Same instant and same place is just a fast retry, which is fine.
  if (elapsedSec <= 0) return metres > 1 ? Infinity : null;

  return (metres / elapsedSec) * 3.6;
}

export function evaluateClaim(ctx: ClaimContext): ClaimVerdict {
  const { spawn, position, now } = ctx;

  if (!coordinatesAreSane(position)) {
    return reject(
      "bad-coordinates",
      "latitude, longitude or accuracy is not a usable number",
    );
  }

  // Cheapest global guards first — no point measuring distance for someone who
  // cannot be funded regardless of where they are standing.
  if (ctx.totalClaimsUsed >= MAX_SCHOLARSHIPS) {
    return reject(
      "budget-exhausted",
      `all ${MAX_SCHOLARSHIPS} scholarships have been funded`,
    );
  }

  if (ctx.personHasClaimed) {
    return reject(
      "already-claimed",
      "this person has already been funded once",
    );
  }

  if (ctx.spawnClaimsUsed >= spawn.capacity) {
    return reject(
      "spawn-exhausted",
      `${spawn.name} has given out all ${spawn.capacity} of its scholarships`,
    );
  }

  if (!isSpawnActive(spawn, now)) {
    const [open, close] = spawn.activeHours;
    return reject(
      "spawn-inactive",
      `${spawn.name} is only active between ${open}:00 and ${close}:00 local time`,
    );
  }

  // A loose fix cannot prove proximity in either direction, so refuse to guess
  // rather than quietly widening the radius by the error margin — treating
  // accuracy as slack would let a caller claim from anywhere by reporting a
  // large enough uncertainty.
  if (position.accuracy > MAX_ACCURACY_METERS) {
    return reject(
      "poor-accuracy",
      `location is only accurate to ${Math.round(position.accuracy)}m; need ${MAX_ACCURACY_METERS}m or better`,
    );
  }

  const distance = distanceMeters(
    position.lat,
    position.lon,
    spawn.lat,
    spawn.lon,
  );
  if (distance > spawn.radiusMeters) {
    return reject(
      "out-of-range",
      `${Math.round(distance)}m from ${spawn.name}, need to be within ${spawn.radiusMeters}m`,
    );
  }

  if (ctx.lastSeen) {
    const speed = impliedSpeedKmh(ctx.lastSeen, position, now.getTime());
    if (speed !== null && speed > MAX_TRAVEL_KMH) {
      return reject(
        "impossible-travel",
        `implies travelling at ${Math.round(speed)}km/h since the last reading`,
      );
    }
  }

  return { ok: true, distanceMeters: Math.round(distance) };
}

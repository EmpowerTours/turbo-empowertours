/**
 * Treasure hunt spawn table.
 *
 * Spawns live on the server and are never trusted from the client. The browser
 * reports where it thinks it is; the server decides whether that is close
 * enough. A client that computes its own "I am in range" is not consulted.
 *
 * A spawn is a place, not a prize. Its `capacity` is how many people can be
 * funded from it in total; the one-scholarship-per-person cap lives in the
 * claim logic, so a spawn is not consumed by the first person to reach it.
 */

/** Tierra Colorada, Guerrero. Used as the map centre and the fallback origin. */
export const VILLAGE_CENTRE = { lat: 17.1614, lon: -99.5283 } as const;

/** Everything time-related is judged in the village's own clock, not the server's. */
export const VILLAGE_TIMEZONE = "America/Mexico_City";

export interface Spawn {
  readonly id: string;
  /** Shown on the map. */
  readonly name: string;
  /** The riddle. There is nothing physical to see, so this is the whole game. */
  readonly hint: string;
  readonly lat: number;
  readonly lon: number;
  /**
   * Claim radius. Browser GPS is routinely +/-20-50m and worse under tree
   * cover, so anything under ~75m tells honest people standing in the right
   * place that they are not there.
   */
  readonly radiusMeters: number;
  /** Local hour window [openInclusive, closeExclusive). Daylight only. */
  readonly activeHours: readonly [number, number];
  /** Total scholarships fundable from this location. */
  readonly capacity: number;
}

/**
 * PLACEHOLDER SPAWNS — the coordinates below are offsets from the village
 * centroid, not surveyed locations. Replace every one of them by standing in
 * the real spot and reading the phone's coordinates. Shipping these as-is will
 * scatter claim zones across whatever happens to be at those offsets.
 */
export const SPAWNS: readonly Spawn[] = [
  {
    id: "centro",
    name: "El Centro",
    hint: "Where the town gathers when the sun is highest.",
    lat: 17.1614,
    lon: -99.5283,
    radiusMeters: 120,
    activeHours: [9, 18],
    capacity: 40,
  },
  {
    id: "mercado",
    name: "El Mercado",
    hint: "Follow the smell of breakfast before the morning is spent.",
    lat: 17.1629,
    lon: -99.5271,
    radiusMeters: 100,
    activeHours: [7, 14],
    capacity: 40,
  },
  {
    id: "rio",
    name: "El Río",
    hint: "Down where the water runs and the road stops pretending.",
    lat: 17.1588,
    lon: -99.5309,
    radiusMeters: 150,
    activeHours: [9, 17],
    capacity: 30,
  },
] as const;

export function getSpawn(id: string): Spawn | undefined {
  return SPAWNS.find((s) => s.id === id);
}

/** Great-circle distance in metres. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** The village's local hour, 0-23. `h23` avoids the midnight-as-24 quirk. */
export function localHour(at: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: VILLAGE_TIMEZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(at),
  );
}

export function isSpawnActive(spawn: Spawn, at: Date = new Date()): boolean {
  const hour = localHour(at);
  const [open, close] = spawn.activeHours;
  // Windows do not currently wrap past midnight; a night spawn would need
  // `open > close` handling here, and a reason to send people out after dark.
  return hour >= open && hour < close;
}

export interface NearbySpawn {
  readonly id: string;
  readonly name: string;
  readonly hint: string;
  readonly lat: number;
  readonly lon: number;
  readonly radiusMeters: number;
  readonly distanceMeters: number;
  readonly active: boolean;
}

/**
 * Spawns worth drawing on someone's map. Returns the location openly — with
 * nothing physical to find, hiding the coordinates would leave players with no
 * way to discover anything. Knowing where a spawn is has never been the gate;
 * being there is.
 */
export function spawnsNear(
  lat: number,
  lon: number,
  withinMeters = 5000,
  at: Date = new Date(),
): NearbySpawn[] {
  return SPAWNS.map((s) => ({
    id: s.id,
    name: s.name,
    hint: s.hint,
    lat: s.lat,
    lon: s.lon,
    radiusMeters: s.radiusMeters,
    distanceMeters: Math.round(distanceMeters(lat, lon, s.lat, s.lon)),
    active: isSpawnActive(s, at),
  }))
    .filter((s) => s.distanceMeters <= withinMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

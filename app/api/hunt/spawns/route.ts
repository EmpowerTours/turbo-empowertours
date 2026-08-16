import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { spawnsNear, VILLAGE_CENTRE } from "@/lib/hunt/spawns";
import { MAX_SCHOLARSHIPS } from "@/lib/hunt/claim";

export const dynamic = "force-dynamic";

/**
 * Spawns to draw on the map.
 *
 * Unauthenticated and open about where things are. With nothing physical
 * placed in the world, a hidden spawn is one nobody can find — discovery is the
 * point of the map. Knowing the coordinates was never the gate; standing on
 * them is, and that is checked when claiming.
 */
export async function GET(req: NextRequest) {
  try {
    const latParam = req.nextUrl.searchParams.get("lat");
    const lonParam = req.nextUrl.searchParams.get("lon");

    // Fall back to the village centre so a first-time visitor who has not yet
    // granted location permission still sees a populated map.
    const lat = latParam === null ? VILLAGE_CENTRE.lat : Number(latParam);
    const lon = lonParam === null ? VILLAGE_CENTRE.lon : Number(lonParam);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    ) {
      return NextResponse.json(
        { error: "lat and lon must be valid coordinates" },
        { status: 400 },
      );
    }

    const nearby = spawnsNear(lat, lon);

    const counts = await Promise.all(
      nearby.map((s) => redis.get<number>(`hunt:spawncount:${s.id}`)),
    );
    const total = Number((await redis.get<number>("hunt:total")) ?? 0);

    return NextResponse.json({
      centre: { lat, lon },
      scholarshipsRemaining: Math.max(0, MAX_SCHOLARSHIPS - total),
      spawns: nearby.map((s, i) => ({
        ...s,
        claimsTaken: Number(counts[i] ?? 0),
      })),
    });
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error("[Hunt] spawns failed:", detail);
    return NextResponse.json(
      { error: "Could not load spawns", detail },
      { status: 500 },
    );
  }
}

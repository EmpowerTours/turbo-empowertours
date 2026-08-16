import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { verifyPerson } from "@/lib/hunt/identity";
import { getSpawn } from "@/lib/hunt/spawns";
import {
  evaluateClaim,
  MAX_SCHOLARSHIPS,
  type LastSeen,
} from "@/lib/hunt/claim";

export const dynamic = "force-dynamic";

/**
 * Claim a treasure spawn.
 *
 * This route records an *entitlement*, it does not move money. Paying the
 * Explorer month happens in a separate redemption step so that a bug in the
 * proximity logic cannot drain the scholarship budget on its own — the spend
 * stays behind its own gate.
 */

const keys = {
  claimed: (userId: string) => `hunt:claimed:${userId}`,
  lastSeen: (userId: string) => `hunt:lastseen:${userId}`,
  spawnCount: (spawnId: string) => `hunt:spawncount:${spawnId}`,
  total: "hunt:total",
  awards: "hunt:awards",
};

export async function POST(req: NextRequest) {
  try {
    const person = await verifyPerson(req.headers.get("authorization"));
    if (!person) {
      return NextResponse.json({ error: "Sign in to claim" }, { status: 401 });
    }
    if (!person.hasPhone) {
      return NextResponse.json(
        {
          error: "Verify a phone number before claiming",
          reason: "phone-required",
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { spawnId, lat, lon, accuracy } = body ?? {};

    const spawn = getSpawn(String(spawnId ?? ""));
    if (!spawn) {
      return NextResponse.json({ error: "Unknown spawn" }, { status: 404 });
    }

    const position = {
      lat: Number(lat),
      lon: Number(lon),
      accuracy: Number(accuracy),
    };
    const now = new Date();

    const [claimedRaw, lastSeenRaw, spawnCountRaw, totalRaw] =
      await Promise.all([
        redis.get<string>(keys.claimed(person.userId)),
        redis.get<LastSeen>(keys.lastSeen(person.userId)),
        redis.get<number>(keys.spawnCount(spawn.id)),
        redis.get<number>(keys.total),
      ]);

    const verdict = evaluateClaim({
      spawn,
      position,
      now,
      personHasClaimed: Boolean(claimedRaw),
      spawnClaimsUsed: Number(spawnCountRaw ?? 0),
      totalClaimsUsed: Number(totalRaw ?? 0),
      lastSeen: lastSeenRaw ?? undefined,
    });

    // Record the reading even when the claim fails. With one scholarship per
    // person a successful claim never repeats, so this trail is what makes the
    // impossible-travel check meaningful at all: it catches someone probing
    // several spawns from a chair rather than someone claiming twice.
    if (Number.isFinite(position.lat) && Number.isFinite(position.lon)) {
      await redis.set(
        keys.lastSeen(person.userId),
        {
          lat: position.lat,
          lon: position.lon,
          at: now.getTime(),
        } satisfies LastSeen,
        { ex: 60 * 60 * 24 },
      );
    }

    if (!verdict.ok) {
      return NextResponse.json(
        { claimed: false, reason: verdict.reason, detail: verdict.detail },
        { status: 400 },
      );
    }

    // Reserve atomically. Contention is near zero at village scale, but this is
    // the budget boundary, so it fails closed rather than trusting the read
    // above to still be true.
    const reserved = await redis.set(
      keys.claimed(person.userId),
      now.toISOString(),
      { nx: true },
    );
    if (reserved !== "OK") {
      return NextResponse.json(
        {
          claimed: false,
          reason: "already-claimed",
          detail: "a claim for this person landed first",
        },
        { status: 409 },
      );
    }

    const total = await redis.incr(keys.total);
    if (total > MAX_SCHOLARSHIPS) {
      await Promise.all([
        redis.decr(keys.total),
        redis.del(keys.claimed(person.userId)),
      ]);
      return NextResponse.json(
        {
          claimed: false,
          reason: "budget-exhausted",
          detail: `all ${MAX_SCHOLARSHIPS} scholarships are gone`,
        },
        { status: 409 },
      );
    }

    const spawnCount = await redis.incr(keys.spawnCount(spawn.id));
    if (spawnCount > spawn.capacity) {
      await Promise.all([
        redis.decr(keys.spawnCount(spawn.id)),
        redis.decr(keys.total),
        redis.del(keys.claimed(person.userId)),
      ]);
      return NextResponse.json(
        {
          claimed: false,
          reason: "spawn-exhausted",
          detail: `${spawn.name} just gave out its last one`,
        },
        { status: 409 },
      );
    }

    const award = {
      userId: person.userId,
      wallet: person.wallet,
      spawnId: spawn.id,
      spawnName: spawn.name,
      distanceMeters: verdict.distanceMeters,
      accuracyMeters: Math.round(position.accuracy),
      claimedAt: now.toISOString(),
      /** Explorer month one. Unredeemed until the payMonthly step runs. */
      tier: 1,
      status: "pending-redemption" as const,
    };

    await Promise.all([
      redis.set(keys.claimed(person.userId), JSON.stringify(award)),
      redis.lpush(keys.awards, JSON.stringify(award)),
    ]);

    console.log(
      `[Hunt] ${person.userId} claimed ${spawn.id} at ${verdict.distanceMeters}m (${total}/${MAX_SCHOLARSHIPS})`,
    );

    return NextResponse.json({
      claimed: true,
      spawn: { id: spawn.id, name: spawn.name },
      distanceMeters: verdict.distanceMeters,
      award: {
        tier: 1,
        description: "One month of TURBO Explorer",
        status: award.status,
      },
      remaining: MAX_SCHOLARSHIPS - total,
    });
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error("[Hunt] claim failed:", detail);
    return NextResponse.json(
      { error: "Claim failed", detail },
      { status: 500 },
    );
  }
}

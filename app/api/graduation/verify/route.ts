import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { verifyDeploy } from "@/lib/graduation/verifyDeploy";

export const dynamic = "force-dynamic";

/**
 * Graduation: a student proves they deployed a contract to Monad mainnet.
 *
 * Deliberately unauthenticated. The on-chain proof *is* the authentication —
 * a record is only written for the wallet that the receipt names as sender, so
 * there is nothing to gain by submitting on someone else's behalf. Everything
 * read here is public chain data.
 */

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH = /^0x[a-fA-F0-9]{64}$/;

export async function POST(req: NextRequest) {
  try {
    const { wallet, txHash } = await req.json();

    if (!ADDRESS.test(wallet ?? "")) {
      return NextResponse.json(
        { error: "wallet must be a 0x address" },
        { status: 400 },
      );
    }
    if (!TX_HASH.test(txHash ?? "")) {
      return NextResponse.json(
        { error: "txHash must be a 0x transaction hash" },
        { status: 400 },
      );
    }

    const walletLower = wallet.toLowerCase();
    const verdict = await verifyDeploy(walletLower, txHash);

    if (!verdict.ok) {
      return NextResponse.json(
        { verified: false, reason: verdict.reason, detail: verdict.detail },
        { status: 400 },
      );
    }

    // Copy-paste guard: the same runtime bytecode cannot graduate twice. Two
    // students who both deploy the identical tutorial contract are a real
    // scenario, and only the first one has demonstrated anything.
    const claimKey = `grad:codehash:${verdict.codeHash}`;
    const existingClaim = await redis.get<string>(claimKey);

    if (existingClaim && existingClaim !== walletLower) {
      return NextResponse.json(
        {
          verified: false,
          reason: "duplicate-bytecode",
          detail:
            "this exact contract has already been used to graduate by another wallet",
        },
        { status: 409 },
      );
    }

    const record = {
      wallet: walletLower,
      contractAddress: verdict.contractAddress,
      codeHash: verdict.codeHash,
      codeSize: verdict.codeSize,
      blockNumber: verdict.blockNumber.toString(),
      txHash,
      verifiedAt: new Date().toISOString(),
    };

    await redis.set(claimKey, walletLower);
    await redis.hset(`grad:deploys:${walletLower}`, {
      [verdict.contractAddress]: JSON.stringify(record),
    });
    await redis.sadd("grad:graduates", walletLower);

    console.log(
      `[Graduation] ${walletLower} verified deploy ${verdict.contractAddress}`,
    );

    return NextResponse.json({ verified: true, ...record });
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error("[Graduation] verify failed:", detail);
    return NextResponse.json(
      { error: "Verification failed", detail },
      { status: 500 },
    );
  }
}

/** GET /api/graduation/verify?wallet=0x… — deploys this wallet has proven. */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!ADDRESS.test(wallet ?? "")) {
    return NextResponse.json(
      { error: "wallet must be a 0x address" },
      { status: 400 },
    );
  }

  const walletLower = wallet!.toLowerCase();
  const deploys = await redis.hgetall<Record<string, string>>(
    `grad:deploys:${walletLower}`,
  );
  const records = Object.values(deploys ?? {}).map((v) =>
    typeof v === "string" ? JSON.parse(v) : v,
  );

  return NextResponse.json({
    wallet: walletLower,
    graduated: records.length > 0,
    deploys: records,
  });
}

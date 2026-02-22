import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, isAddress } from 'viem';
import { monad } from '@/lib/monad';
import {
  TURBO_COHORT_ADDRESS,
  TURBO_COHORT_ABI,
  TIER_NAMES,
} from '@/lib/contracts';

export const dynamic = 'force-dynamic';

const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get('address');

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing address parameter' },
        { status: 400 }
      );
    }

    const cohortId = await publicClient.readContract({
      address: TURBO_COHORT_ADDRESS,
      abi: TURBO_COHORT_ABI,
      functionName: 'currentCohortId',
    });

    const memberData = await publicClient.readContract({
      address: TURBO_COHORT_ADDRESS,
      abi: TURBO_COHORT_ABI,
      functionName: 'getMember',
      args: [cohortId, address as `0x${string}`],
    });

    // getMember returns: name, email, telegram, tier, monthsPaid, lastPayment, tokenId, paymentTimestamps, banned
    const tier = memberData[3];
    const monthsPaid = memberData[4];
    const lastPayment = memberData[5];

    // Fetch tier prices
    const tierPrices = await Promise.all(
      [0, 1, 2].map((t) =>
        publicClient.readContract({
          address: TURBO_COHORT_ADDRESS,
          abi: TURBO_COHORT_ABI,
          functionName: 'tierPrice',
          args: [t],
        })
      )
    );

    return NextResponse.json({
      success: true,
      member: {
        address,
        tier: Number(tier),
        tierName: TIER_NAMES[Number(tier)] || 'None',
        monthsPaid: Number(monthsPaid),
        lastPayment: Number(lastPayment),
        active: Number(monthsPaid) > 0,
      },
      cohortId: Number(cohortId),
      tierPrices: {
        explorer: formatUnits(tierPrices[0], 18),
        builder: formatUnits(tierPrices[1], 18),
        founder: formatUnits(tierPrices[2], 18),
      },
    });
  } catch (error) {
    console.error('[Member] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch member data' },
      { status: 500 }
    );
  }
}

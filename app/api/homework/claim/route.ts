import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getWeekReward, transferTours } from '@/lib/homework/rewards';

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json();
    if (!wallet) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 });
    }

    const walletLower = wallet.toLowerCase();

    // Get completed weeks
    const completedSet = await redis.smembers(`hw:completed:${walletLower}`) as string[];
    if (!completedSet.length) {
      return NextResponse.json({ error: 'No completed weeks' }, { status: 400 });
    }

    // Find weeks that are completed but not yet rewarded
    const rewardsRaw = await redis.hgetall(`hw:rewards:${walletLower}`) as Record<string, string> | null;
    const rewardedWeeks = new Set<number>();
    if (rewardsRaw) {
      for (const key of Object.keys(rewardsRaw)) {
        const weekNum = parseInt(key.replace('week-', ''), 10);
        if (!isNaN(weekNum)) rewardedWeeks.add(weekNum);
      }
    }

    const unclaimedWeeks = completedSet
      .map(Number)
      .filter(w => !rewardedWeeks.has(w))
      .sort((a, b) => a - b);

    if (!unclaimedWeeks.length) {
      return NextResponse.json({ error: 'All rewards already claimed' }, { status: 400 });
    }

    // Calculate total amount
    let totalAmount = 0;
    for (const w of unclaimedWeeks) {
      totalAmount += getWeekReward(w);
    }

    console.log(`[Homework] Claiming ${totalAmount} TOURS for ${walletLower} (weeks: ${unclaimedWeeks.join(', ')})`);

    // Transfer TOURS in a single transaction
    const txHash = await transferTours(walletLower, totalAmount);

    // Record each week's reward
    const rewardEntries: Record<string, string> = {};
    const now = new Date().toISOString();
    for (const w of unclaimedWeeks) {
      rewardEntries[`week-${w}`] = JSON.stringify({
        amount: getWeekReward(w),
        txHash,
        distributedAt: now,
      });
      // Remove from pending
      await redis.srem(`hw:pending-reward:${w}`, walletLower);
    }
    await redis.hset(`hw:rewards:${walletLower}`, rewardEntries);

    console.log(`[Homework] Claimed: ${totalAmount} TOURS to ${walletLower}, tx: ${txHash}`);
    return NextResponse.json({
      success: true,
      totalAmount,
      weeks: unclaimedWeeks,
      txHash,
    });
  } catch (err) {
    console.error('[Homework] Claim error:', err);
    const message = err instanceof Error ? err.message : 'Claim failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

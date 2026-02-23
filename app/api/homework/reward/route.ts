import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getWeekReward, transferTours } from '@/lib/homework/rewards';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.TURBO_ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet, week } = await req.json();
    if (!wallet || !week) {
      return NextResponse.json({ error: 'wallet and week required' }, { status: 400 });
    }

    const walletLower = wallet.toLowerCase();

    // Verify week is completed
    const isMember = await redis.sismember(`hw:completed:${walletLower}`, String(week));
    if (!isMember) {
      return NextResponse.json({ error: 'Week not completed' }, { status: 400 });
    }

    // Check if already rewarded
    const existingReward = await redis.hget(`hw:rewards:${walletLower}`, `week-${week}`);
    if (existingReward) {
      return NextResponse.json({ error: 'Already rewarded' }, { status: 400 });
    }

    const amount = getWeekReward(week);
    console.log(`[Homework] Distributing ${amount} TOURS to ${walletLower} for week ${week}`);

    const txHash = await transferTours(walletLower, amount);

    // Record reward
    await redis.hset(`hw:rewards:${walletLower}`, {
      [`week-${week}`]: JSON.stringify({ amount, txHash, distributedAt: new Date().toISOString() }),
    });

    // Remove from pending
    await redis.srem(`hw:pending-reward:${week}`, walletLower);

    console.log(`[Homework] Reward sent: ${amount} TOURS to ${walletLower}, tx: ${txHash}`);
    return NextResponse.json({ success: true, amount, txHash });
  } catch (err) {
    console.error('[Homework] Reward error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

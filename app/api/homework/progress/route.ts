import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { CURRICULUM } from '@/lib/homework/curriculum';
import { getWeekReward } from '@/lib/homework/rewards';

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase();
    if (!wallet) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 });
    }

    // GitHub link status
    const githubRaw = await redis.get(`hw:github:${wallet}`) as string | null;
    const github = githubRaw ? (typeof githubRaw === 'string' ? JSON.parse(githubRaw) : githubRaw) : null;

    // Completed weeks
    const completedSet = await redis.smembers(`hw:completed:${wallet}`) as string[];
    const completedWeeks = completedSet.map(Number).sort((a, b) => a - b);

    // Progress details
    const progressRaw = await redis.hgetall(`hw:progress:${wallet}`) as Record<string, string> | null;
    const progress: Record<string, { completedAt: string; commitSha: string; verified: boolean }> = {};
    if (progressRaw) {
      for (const [key, val] of Object.entries(progressRaw)) {
        progress[key] = typeof val === 'string' ? JSON.parse(val) : val;
      }
    }

    // Rewards
    const rewardsRaw = await redis.hgetall(`hw:rewards:${wallet}`) as Record<string, string> | null;
    const rewards: Record<string, { amount: number; txHash: string; distributedAt: string }> = {};
    if (rewardsRaw) {
      for (const [key, val] of Object.entries(rewardsRaw)) {
        rewards[key] = typeof val === 'string' ? JSON.parse(val) : val;
      }
    }

    // Calculate totals
    let totalEarned = 0;
    let totalDistributed = 0;
    for (const w of completedWeeks) {
      totalEarned += getWeekReward(w);
    }
    for (const r of Object.values(rewards)) {
      totalDistributed += r.amount;
    }

    return NextResponse.json({
      success: true,
      github: github ? { username: github.username, avatarUrl: github.avatarUrl, linkedAt: github.linkedAt } : null,
      completedWeeks,
      totalWeeks: CURRICULUM.length,
      progress,
      rewards,
      totalEarned,
      totalDistributed,
      pendingReward: totalEarned - totalDistributed,
    });
  } catch (err) {
    console.error('[Homework] Progress error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

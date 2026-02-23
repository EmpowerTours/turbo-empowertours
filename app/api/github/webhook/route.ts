import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { verifyWebhookSignature } from '@/lib/homework/github';
import { CURRICULUM } from '@/lib/homework/curriculum';
import { getWeekReward } from '@/lib/homework/rewards';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-hub-signature-256') || '';

    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = req.headers.get('x-github-event');
    if (event !== 'push') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const payload = JSON.parse(body);
    const pusher = payload.pusher?.name?.toLowerCase();
    if (!pusher) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Look up wallet from GitHub username
    const wallet = await redis.get(`hw:wallet:${pusher}`) as string | null;
    if (!wallet) {
      return NextResponse.json({ ok: true, message: 'Unknown user' });
    }

    // Collect all file paths from commits
    const files = new Set<string>();
    for (const commit of payload.commits || []) {
      for (const f of [...(commit.added || []), ...(commit.modified || [])]) {
        files.add(f);
      }
    }

    // Check against curriculum deliverables
    let matched = 0;
    for (const entry of CURRICULUM) {
      const weekKey = `${entry.week}`;

      // Skip if already completed
      const existing = await redis.hget(`hw:progress:${wallet}`, `week-${weekKey}`);
      if (existing) continue;

      // Check if any committed file matches the deliverable
      const deliverable = entry.deliverable;
      const hasMatch = Array.from(files).some(f => f.endsWith(deliverable) || f.includes(deliverable));

      if (hasMatch) {
        const now = new Date().toISOString();
        const commitSha = payload.after || payload.commits?.[0]?.id || '';

        // Mark completed
        await redis.hset(`hw:progress:${wallet}`, {
          [`week-${weekKey}`]: JSON.stringify({ completedAt: now, commitSha, verified: true }),
        });
        await redis.sadd(`hw:completed:${wallet}`, weekKey);

        // Add to pending rewards
        const reward = getWeekReward(entry.week);
        await redis.sadd(`hw:pending-reward:${weekKey}`, wallet);

        // Update leaderboard
        await redis.zincrby('hw:leaderboard', 1, wallet);

        matched++;
        console.log(`[Homework] Week ${entry.week} completed by ${wallet} (${pusher}), reward: ${reward} TOURS`);
      }
    }

    return NextResponse.json({ ok: true, matched });
  } catch (err) {
    console.error('[Homework] Webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

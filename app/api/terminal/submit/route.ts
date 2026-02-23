import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { CURRICULUM } from '@/lib/homework/curriculum';
import { pushFileToRepo } from '@/lib/homework/github';

export async function POST(req: NextRequest) {
  try {
    const { wallet, weekNumber, content } = (await req.json()) as {
      wallet: string;
      weekNumber: number;
      content: string;
    };

    if (!wallet || !weekNumber || !content) {
      return Response.json({ error: 'Missing wallet, weekNumber, or content' }, { status: 400 });
    }

    // Look up GitHub data from Redis
    const raw = await redis.get(`hw:github:${wallet.toLowerCase()}`);
    const githubData: { username: string; token: string } | null =
      typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!githubData || !githubData.username) {
      return Response.json(
        { error: 'GitHub not linked. Please link your GitHub account first.' },
        { status: 400 },
      );
    }

    // Find the curriculum entry
    const week = CURRICULUM.find(w => w.week === weekNumber);
    if (!week) {
      return Response.json({ error: `Invalid week number: ${weekNumber}` }, { status: 400 });
    }

    console.log(`[Submit] Pushing for ${githubData.username}, week ${weekNumber}`);

    // Push file using App installation token (not user token)
    const result = await pushFileToRepo(
      githubData.username,
      week.deliverable,
      content,
      `Week ${weekNumber} submission: ${week.title} (by ${githubData.username})`,
    );

    return Response.json({
      success: true,
      commitSha: result.sha,
      url: result.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[Submit] Error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

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
    const githubData = await redis.get<{ username: string; token: string }>(
      `hw:github:${wallet.toLowerCase()}`,
    );
    if (!githubData) {
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

    // Push file to GitHub
    try {
      const result = await pushFileToRepo(
        githubData.token,
        githubData.username,
        week.deliverable,
        content,
        `Week ${weekNumber} submission: ${week.title}`,
      );

      return Response.json({
        success: true,
        commitSha: result.sha,
        url: result.url,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'NEEDS_RELINK') {
        return Response.json(
          {
            error: 'Your GitHub token needs repo access. Please re-link your GitHub account.',
            needsRelink: true,
          },
          { status: 403 },
        );
      }
      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}

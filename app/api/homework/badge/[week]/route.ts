import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { generateBadgeSVG } from '@/lib/homework/badges';
import { MILESTONES } from '@/lib/homework/curriculum';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ week: string }> },
) {
  try {
    const { week: weekStr } = await params;
    const week = parseInt(weekStr, 10);
    if (!MILESTONES.includes(week as typeof MILESTONES[number])) {
      return NextResponse.json({ error: 'Not a milestone week' }, { status: 400 });
    }

    const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase();
    if (!wallet) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 });
    }

    // Verify all weeks up to this milestone are complete
    const completedSet = await redis.smembers(`hw:completed:${wallet}`) as string[];
    const completedWeeks = new Set(completedSet.map(Number));
    for (let w = 1; w <= week; w++) {
      if (!completedWeeks.has(w)) {
        return NextResponse.json({ error: `Week ${w} not completed` }, { status: 400 });
      }
    }

    // Get completion date for this week
    const progressRaw = await redis.hget(`hw:progress:${wallet}`, `week-${week}`) as string | null;
    const completedAt = progressRaw
      ? (typeof progressRaw === 'string' ? JSON.parse(progressRaw) : progressRaw).completedAt
      : new Date().toISOString();

    const svg = generateBadgeSVG(week, wallet, completedAt);
    if (!svg) {
      return NextResponse.json({ error: 'Badge generation failed' }, { status: 500 });
    }

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[Homework] Badge error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

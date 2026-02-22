import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const key = `turbo:app:${normalizedEmail}`;

    const raw = await redis.get(key);
    if (!raw) {
      return NextResponse.json(
        { success: false, error: 'No application found for this email' },
        { status: 404 }
      );
    }

    const app = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Return only non-sensitive fields
    return NextResponse.json({
      success: true,
      application: {
        name: app.name,
        tier: app.tier,
        status: app.status,
        appliedAt: app.appliedAt,
      },
    });
  } catch (error) {
    console.error('[TurboStatus] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to look up application' },
      { status: 500 }
    );
  }
}

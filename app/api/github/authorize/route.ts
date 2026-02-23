import { NextRequest, NextResponse } from 'next/server';
import { buildOAuthUrl } from '@/lib/homework/github';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  }

  // Use X-Forwarded headers or NEXT_PUBLIC_APP_URL for the redirect URI
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
  const redirectUri = `${origin}/api/github/callback`;

  const url = buildOAuthUrl(wallet, redirectUri);
  return NextResponse.redirect(url);
}

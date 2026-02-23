import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { verifyState, exchangeCodeForToken, fetchGitHubUser } from '@/lib/homework/github';

function getOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  return process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(`${origin}/homework?error=missing_params`);
    }

    const wallet = verifyState(state);
    if (!wallet) {
      return NextResponse.redirect(`${origin}/homework?error=invalid_state`);
    }

    const token = await exchangeCodeForToken(code);
    const ghUser = await fetchGitHubUser(token);

    // Store in Redis
    await redis.set(`hw:github:${wallet.toLowerCase()}`, JSON.stringify({
      username: ghUser.login,
      token,
      avatarUrl: ghUser.avatar_url,
      githubId: ghUser.id,
      linkedAt: new Date().toISOString(),
    }));

    // Reverse lookup
    await redis.set(`hw:wallet:${ghUser.login.toLowerCase()}`, wallet.toLowerCase());

    console.log(`[Homework] GitHub linked: ${wallet} → ${ghUser.login}`);
    return NextResponse.redirect(`${origin}/homework?linked=true`);
  } catch (err) {
    console.error('[Homework] OAuth callback error:', err);
    return NextResponse.redirect(`${origin}/homework?error=oauth_failed`);
  }
}

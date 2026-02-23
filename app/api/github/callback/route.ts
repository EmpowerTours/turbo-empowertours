import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { verifyState, exchangeCodeForToken, fetchGitHubUser } from '@/lib/homework/github';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/homework?error=missing_params', req.url));
    }

    const wallet = verifyState(state);
    if (!wallet) {
      return NextResponse.redirect(new URL('/homework?error=invalid_state', req.url));
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
    return NextResponse.redirect(new URL('/homework?linked=true', req.url));
  } catch (err) {
    console.error('[Homework] OAuth callback error:', err);
    return NextResponse.redirect(new URL('/homework?error=oauth_failed', req.url));
  }
}

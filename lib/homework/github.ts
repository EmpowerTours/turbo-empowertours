import { createHmac, createSign, timingSafeEqual } from 'crypto';

const GITHUB_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET || '';
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const GITHUB_STATE_SECRET = process.env.GITHUB_STATE_SECRET || '';
const GITHUB_APP_ID = process.env.GITHUB_APP_ID || '';
const GITHUB_APP_PRIVATE_KEY = (process.env.GITHUB_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const GITHUB_APP_INSTALLATION_ID = process.env.GITHUB_APP_INSTALLATION_ID || '';

/** Build the GitHub OAuth URL */
export function buildOAuthUrl(wallet: string, redirectUri: string): string {
  const state = signState(wallet);
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

/** Sign wallet address into HMAC state param */
export function signState(wallet: string): string {
  const hmac = createHmac('sha256', GITHUB_STATE_SECRET);
  hmac.update(wallet);
  return `${wallet}:${hmac.digest('hex')}`;
}

/** Verify HMAC state param, returns wallet or null */
export function verifyState(state: string): string | null {
  const idx = state.lastIndexOf(':');
  if (idx === -1) return null;
  const wallet = state.slice(0, idx);
  const sig = state.slice(idx + 1);
  const expected = createHmac('sha256', GITHUB_STATE_SECRET).update(wallet).digest('hex');
  try {
    if (timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return wallet;
    }
  } catch {
    return null;
  }
  return null;
}

/** Exchange OAuth code for access token */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}

/** Fetch GitHub user profile */
export async function fetchGitHubUser(token: string): Promise<{ login: string; avatar_url: string; id: number }> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to fetch GitHub user');
  return res.json();
}

/** Verify webhook HMAC-SHA256 signature */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!signature || !GITHUB_WEBHOOK_SECRET) return false;
  const expected = 'sha256=' + createHmac('sha256', GITHUB_WEBHOOK_SECRET).update(payload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Check if a file exists in a repo (public or with token) */
export async function checkFileExists(
  owner: string,
  repo: string,
  path: string,
  token?: string,
): Promise<boolean> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers });
  return res.ok;
}

/** Generate a JWT for the GitHub App (valid 10 minutes) */
function generateAppJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iat: now - 60,
    exp: now + 600,
    iss: GITHUB_APP_ID,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(GITHUB_APP_PRIVATE_KEY, 'base64url');

  return `${header}.${payload}.${signature}`;
}

/** Get an installation access token for the GitHub App */
let _cachedInstallToken: { token: string; expiresAt: number } | null = null;

async function getInstallationToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (_cachedInstallToken && _cachedInstallToken.expiresAt > Date.now() + 300_000) {
    return _cachedInstallToken.token;
  }

  const jwt = generateAppJWT();
  const res = await fetch(
    `https://api.github.com/app/installations/${GITHUB_APP_INSTALLATION_ID}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github.v3+json',
      },
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[GitHub] Failed to get installation token:', res.status, JSON.stringify(err));
    throw new Error('Failed to get GitHub App installation token');
  }

  const data = await res.json();
  _cachedInstallToken = {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
  };

  return data.token;
}

/** Push (create or update) a file to the org repo using App installation token.
 *  Each student's files go under students/{username}/{deliverable}. */
export async function pushFileToRepo(
  username: string,
  deliverable: string,
  content: string,
  message: string,
): Promise<{ sha: string; url: string }> {
  const org = 'EmpowerTours';
  const repo = 'turbo-homework';
  const path = `students/${username}/${deliverable}`;

  // Use App installation token instead of user token
  const token = await getInstallationToken();
  const apiHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  // Check if file already exists (need SHA for updates)
  const existing = await fetch(
    `https://api.github.com/repos/${org}/${repo}/contents/${path}`,
    { headers: apiHeaders },
  );

  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString('base64'),
  };
  if (existing.ok) {
    const data = await existing.json();
    body.sha = data.sha;
  }

  const res = await fetch(
    `https://api.github.com/repos/${org}/${repo}/contents/${path}`,
    { method: 'PUT', headers: apiHeaders, body: JSON.stringify(body) },
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || 'Push failed');
  }

  const result = await res.json();
  return { sha: result.content.sha, url: result.content.html_url };
}

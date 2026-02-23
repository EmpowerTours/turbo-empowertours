import { createHmac, timingSafeEqual } from 'crypto';

const GITHUB_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET || '';
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const GITHUB_STATE_SECRET = process.env.GITHUB_STATE_SECRET || '';

/** Build the GitHub OAuth URL */
export function buildOAuthUrl(wallet: string, redirectUri: string): string {
  const state = signState(wallet);
  // GitHub Apps derive permissions from the App's settings, not OAuth scopes.
  // The scope param is not used here — set Contents: Read & Write on the App.
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

/** Push (create or update) a file to a GitHub repo via Contents API.
 *  Pushes to the student's subfolder under the org repo. */
export async function pushFileToRepo(
  token: string,
  username: string,
  deliverable: string,
  content: string,
  message: string,
): Promise<{ sha: string; url: string }> {
  const org = 'EmpowerTours';
  const repo = 'turbo-homework';
  // Each student gets their own folder: students/{username}/{deliverable}
  const path = `students/${username}/${deliverable}`;
  const apiHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  // Check if file already exists (need SHA for updates)
  const existingUrl = `https://api.github.com/repos/${org}/${repo}/contents/${path}`;
  console.log(`[pushFile] GET ${existingUrl} (checking existing)`);
  const existing = await fetch(existingUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
  });
  console.log(`[pushFile] Existing check: ${existing.status}`);

  if (existing.status === 401) {
    throw new Error('NEEDS_RELINK');
  }

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

  console.log(`[pushFile] PUT response: ${res.status}`);
  if (res.status === 401) {
    throw new Error('NEEDS_RELINK');
  }
  if (res.status === 403) {
    const errBody = await res.json().catch(() => ({}));
    console.log(`[pushFile] 403 body:`, JSON.stringify(errBody));
    throw new Error('NEEDS_RELINK');
  }
  if (res.status === 404) {
    const errBody = await res.json().catch(() => ({}));
    console.log(`[pushFile] 404 body:`, JSON.stringify(errBody));
    throw new Error('Repository not found. Please contact support.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Push failed');
  }

  const result = await res.json();
  return { sha: result.content.sha, url: result.content.html_url };
}

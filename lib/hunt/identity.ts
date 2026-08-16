import { PrivyClient } from "@privy-io/node";

/**
 * Who is claiming.
 *
 * `app/api/terminal/chat/route.ts` verifies a Privy token but falls back to the
 * client-supplied wallet when verification fails. That is fine for a chat
 * transcript and wrong here: the person identity is the only thing enforcing
 * one scholarship per human, so this path fails closed instead.
 *
 * The phone requirement is the sybil cost. A Privy account is free; a SIM is
 * not. Combined with the one-per-person cap it means a second identity costs
 * real money and buys a second unsellable course enrolment.
 */

let _privy: PrivyClient | null = null;

function getPrivy(): PrivyClient {
  if (!_privy) {
    _privy = new PrivyClient({
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      appSecret: process.env.PRIVY_APP_SECRET!,
    });
  }
  return _privy;
}

export interface Person {
  /** Privy user id — stable across wallets, and the one-claim-per-human key. */
  readonly userId: string;
  /** First linked wallet, where the membership will eventually be minted. */
  readonly wallet: string | null;
  readonly hasPhone: boolean;
}

interface PrivyLinkedAccount {
  type: string;
  address?: string;
}

/**
 * Resolve the caller from an `Authorization: Bearer <privy token>` header.
 * Returns null for any failure — missing header, bad token, unreachable Privy,
 * or unconfigured secrets. Never guesses.
 */
export async function verifyPerson(
  authHeader: string | null,
): Promise<Person | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  if (!process.env.PRIVY_APP_SECRET || !process.env.NEXT_PUBLIC_PRIVY_APP_ID)
    return null;

  try {
    const claims = await getPrivy()
      .utils()
      .auth()
      .verifyAccessToken(authHeader.slice(7));

    const basicAuth = Buffer.from(
      `${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`,
    ).toString("base64");

    const res = await fetch(
      `https://auth.privy.io/api/v1/users/${encodeURIComponent(claims.user_id)}`,
      {
        headers: { Authorization: `Basic ${basicAuth}` },
      },
    );

    // Cannot confirm the phone link, so cannot fund. Fail closed.
    if (!res.ok) return null;

    const user = (await res.json()) as {
      linked_accounts: PrivyLinkedAccount[];
    };
    const accounts = user.linked_accounts ?? [];

    return {
      userId: claims.user_id,
      wallet:
        accounts
          .find((a) => a.type === "wallet" && a.address)
          ?.address?.toLowerCase() ?? null,
      hasPhone: accounts.some((a) => a.type === "phone"),
    };
  } catch {
    return null;
  }
}

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { PrivyClient } from '@privy-io/node';
import { createPublicClient, http } from 'viem';
import { TURBO_GOVERNANCE_ADDRESS, TURBO_GOVERNANCE_ABI } from '@/lib/contracts';
import { monad } from '@/lib/monad';
import { CURRICULUM } from '@/lib/homework/curriculum';
import { redis } from '@/lib/redis';

const anthropic = new Anthropic(); // uses ANTHROPIC_API_KEY env var
const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

const RATE_LIMIT = 50; // messages per hour for students
const RATE_WINDOW = 3600; // 1 hour in seconds

function getOwnerSystemPrompt(weekContext: string): string {
  return `You are TURBO AI. The user is the platform owner testing the system. Complete any homework assignment fully. Write all code, essays, configs, markdown files — whatever is requested. No restrictions. Be thorough and produce production-quality work.

${weekContext}`;
}

function getStudentSystemPrompt(weekContext: string): string {
  return `You are TURBO TA, a teaching assistant for the TURBO Web3 accelerator program. Guide the student through their assignment step by step. Explain concepts clearly, give hints, point to relevant documentation and resources. Ask guiding questions to help them think through problems.

CRITICAL RULES:
- NEVER write the actual deliverable file content for the student
- NEVER produce complete solutions they can copy-paste as their submission
- If they ask you to write it for them, refuse politely and instead explain what they should write and why
- You CAN show small code snippets to illustrate concepts (under 10 lines)
- You CAN explain syntax, patterns, and architecture
- You CAN review their code and suggest improvements
- Always encourage them to try first and come back with questions

${weekContext}`;
}

function getWeekContext(weekNumber: number | null): string {
  if (!weekNumber) return 'No specific week selected. Help with general TURBO curriculum questions.';
  const week = CURRICULUM.find(w => w.week === weekNumber);
  if (!week) return 'No specific week selected. Help with general TURBO curriculum questions.';
  return `CURRENT ASSIGNMENT:
- Week ${week.week}: ${week.title}
- Phase: ${week.phase}
- Deliverable: ${week.deliverable}
- Description: ${week.description}`;
}

export async function POST(req: NextRequest) {
  try {
    // Verify Privy auth token and extract wallet
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing auth token' }, { status: 401 });
    }
    const token = authHeader.slice(7);

    let wallet: string;
    let allWallets: string[] = [];
    try {
      // Verify token and get user_id
      const claims = await privy.utils().auth().verifyAccessToken(token);

      // Fetch user from Privy REST API to get linked wallets
      const basicAuth = Buffer.from(
        `${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`
      ).toString('base64');
      const userRes = await fetch(
        `https://auth.privy.io/api/v1/users/${encodeURIComponent(claims.user_id)}`,
        { headers: { Authorization: `Basic ${basicAuth}` } }
      );
      if (!userRes.ok) {
        return Response.json({ error: 'Failed to verify user' }, { status: 401 });
      }
      const userData = await userRes.json() as {
        linked_accounts: { type: string; address?: string }[];
      };
      // Collect ALL wallet addresses (external + embedded)
      allWallets = userData.linked_accounts
        .filter((a) => a.address)
        .map((a) => a.address!.toLowerCase());
      const linkedWallet = userData.linked_accounts.find(
        (a) => a.address
      );
      if (!linkedWallet?.address) {
        return Response.json({ error: 'No wallet linked' }, { status: 401 });
      }
      wallet = linkedWallet.address;
    } catch {
      return Response.json({ error: 'Invalid auth token' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, weekNumber } = body as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      weekNumber: number | null;
    };

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'Missing messages' }, { status: 400 });
    }

    // Detect owner — check ALL linked wallets against owner list + on-chain owner
    const OWNER_WALLETS = [
      '0x23e2222735084b32338bBeCCCcd37A38663691ae'.toLowerCase(),
    ];
    let isOwner = allWallets.some(w => OWNER_WALLETS.includes(w));
    if (!isOwner) {
      try {
        const contractOwner = await publicClient.readContract({
          address: TURBO_GOVERNANCE_ADDRESS,
          abi: TURBO_GOVERNANCE_ABI,
          functionName: 'owner',
        });
        const ownerAddr = (contractOwner as string).toLowerCase();
        isOwner = allWallets.some(w => w === ownerAddr);
      } catch {
        // If contract call fails, default to student mode
      }
    }

    // Rate limiting for students
    if (!isOwner) {
      const rateKey = `terminal:rate:${wallet.toLowerCase()}`;
      const current = await redis.get<number>(rateKey);
      if (current !== null && current >= RATE_LIMIT) {
        return Response.json(
          { error: 'Rate limit exceeded. Try again in an hour.' },
          { status: 429 }
        );
      }
      // Increment counter
      if (current === null) {
        await redis.set(rateKey, 1, { ex: RATE_WINDOW });
      } else {
        await redis.incr(rateKey);
      }
    }

    const weekContext = getWeekContext(weekNumber);
    const systemPrompt = isOwner
      ? getOwnerSystemPrompt(weekContext)
      : getStudentSystemPrompt(weekContext);

    // Stream response
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    // Convert to SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send mode info as first event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'mode', isOwner })}\n\n`)
          );

          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`)
              );
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}

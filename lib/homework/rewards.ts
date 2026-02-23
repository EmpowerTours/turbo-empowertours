import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad } from '@/lib/monad';
import { TOURS_TOKEN_ADDRESS, TOURS_TOKEN_ABI } from '@/lib/contracts';

export const WEEKLY_REWARD = 100; // TOURS per completed week

export const MILESTONE_BONUSES: Record<number, number> = {
  8: 500,
  20: 1000,
  36: 1500,
  52: 5000,
};

/** Get the total reward for completing a week (base + bonus if milestone) */
export function getWeekReward(week: number): number {
  return WEEKLY_REWARD + (MILESTONE_BONUSES[week] || 0);
}

/** Maximum possible TOURS over 52 weeks */
export const MAX_TOTAL_REWARDS = 52 * WEEKLY_REWARD + Object.values(MILESTONE_BONUSES).reduce((a, b) => a + b, 0);

const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

function getDeployerWallet() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set');
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({
    account,
    chain: monad,
    transport: http(),
  });
}

/** Transfer TOURS tokens from deployer wallet to recipient */
export async function transferTours(recipient: string, amount: number): Promise<string> {
  const wallet = getDeployerWallet();
  const amountWei = parseUnits(amount.toString(), 18);

  const hash = await wallet.writeContract({
    address: TOURS_TOKEN_ADDRESS,
    abi: TOURS_TOKEN_ABI,
    functionName: 'transfer',
    args: [recipient as `0x${string}`, amountWei],
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

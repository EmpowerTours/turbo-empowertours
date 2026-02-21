export const WMON_ADDRESS = '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A' as const;
export const TURBO_COHORT_ADDRESS = '0xEae06514a0d3daf610cC0778B27f387018521Ab5' as const;

export const WMON_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const TURBO_COHORT_ABI = [
  {
    name: 'tierPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'payMonthly',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [],
  },
  {
    name: 'getMember',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'member', type: 'address' }],
    outputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'monthsPaid', type: 'uint256' },
      { name: 'lastPayment', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'currentCohortId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Tier enum matching the contract
export const TIERS: Record<string, number> = {
  explorer: 0,
  builder: 1,
  founder: 2,
};

export const TIER_NAMES: Record<number, string> = {
  0: 'Explorer',
  1: 'Builder',
  2: 'Founder',
};

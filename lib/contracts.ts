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
    inputs: [{ name: 'cohortId', type: 'uint256' }, { name: 'member', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'tier', type: 'uint8' },
          { name: 'cohortId', type: 'uint256' },
          { name: 'monthsPaid', type: 'uint256' },
          { name: 'lastPaymentTime', type: 'uint256' },
          { name: 'totalPaid', type: 'uint256' },
          { name: 'isFounder', type: 'bool' },
          { name: 'founderAmount', type: 'uint256' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'banned', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'currentCohortId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const TURBO_GOVERNANCE_ADDRESS = '0x9e7A91D9F891373DD0846f443E4484EfA12c4899' as const;

export const TURBO_GOVERNANCE_ABI = [
  { name: 'proposalCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'councilSize', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'isCouncilMember', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'getCouncilMembers', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address[]' }] },
  { name: 'quorumRequired', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getProposal', type: 'function', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [
    { name: 'cohortId', type: 'uint256' }, { name: 'proposer', type: 'address' },
    { name: 'startTime', type: 'uint256' }, { name: 'endTime', type: 'uint256' },
    { name: 'yesVotes', type: 'uint256' }, { name: 'noVotes', type: 'uint256' },
    { name: 'status', type: 'uint8' },
  ]},
  { name: 'getProposalSlate', type: 'function', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [
    { name: 'founders', type: 'address[]' }, { name: 'amounts', type: 'uint256[]' },
  ]},
  { name: 'hasVoted', type: 'function', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'voter', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'activeProposalForCohort', type: 'function', stateMutability: 'view', inputs: [{ name: 'cohortId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const PROPOSAL_STATUS = ['Pending', 'Active', 'Passed', 'Failed', 'Executed', 'Cancelled', 'Vetoed'] as const;
export const PROPOSAL_STATUS_COLORS: Record<number, string> = {
  0: '#71717a', 1: '#06b6d4', 2: '#22c55e', 3: '#ef4444', 4: '#8b5cf6', 5: '#71717a', 6: '#f59e0b',
};

// EmpowerTours Passport (ERC-721) — required to participate in TURBO
export const PASSPORT_ADDRESS = '0x93126e59004692b01961be505aa04f55d5bd1851' as const;
export const PASSPORT_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getPassportByFid', type: 'function', stateMutability: 'view', inputs: [{ name: 'fid', type: 'uint256' }, { name: 'countryCode', type: 'string' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getTotalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

// Tier enum matching the contract: None=0, Explorer=1, Builder=2, Founder=3
export const TIERS: Record<string, number> = {
  explorer: 1,
  builder: 2,
  founder: 3,
};

export const TIER_NAMES: Record<number, string> = {
  1: 'Explorer',
  2: 'Builder',
  3: 'Founder',
};

// TOURS Token (ERC-20) — reward token for homework completions
export const TOURS_TOKEN_ADDRESS = '0x45b76a127167fD7FC7Ed264ad490144300eCfcBF' as const;
export const TOURS_TOKEN_ABI = [
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'transferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;

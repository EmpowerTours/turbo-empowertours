import { MILESTONES, PHASE_COLORS } from './curriculum';

const BADGE_DATA: Record<number, { title: string; subtitle: string; color: string; icon: string }> = {
  8: {
    title: 'FOUNDATIONS',
    subtitle: 'Dev Foundations Complete',
    color: PHASE_COLORS.foundations,
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
  20: {
    title: 'WEB3 BUILDER',
    subtitle: 'Web3 & Blockchain Complete',
    color: PHASE_COLORS.web3,
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  36: {
    title: 'FULL STACK',
    subtitle: 'Full-Stack Dev Complete',
    color: PHASE_COLORS.fullstack,
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  52: {
    title: 'GRADUATE',
    subtitle: 'TURBO Complete — Ready for NITRO',
    color: PHASE_COLORS.business,
    icon: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
  },
};

/** Generate SVG badge for a milestone week */
export function generateBadgeSVG(week: number, walletAddress: string, completedAt: string): string | null {
  if (!MILESTONES.includes(week as typeof MILESTONES[number])) return null;
  const badge = BADGE_DATA[week];
  if (!badge) return null;

  const shortAddr = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  const dateStr = new Date(completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#060608"/>
      <stop offset="100%" stop-color="#0a0a12"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${badge.color}"/>
      <stop offset="100%" stop-color="${badge.color}88"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="400" height="500" rx="20" fill="url(#bg)"/>
  <rect width="400" height="500" rx="20" fill="none" stroke="${badge.color}22" stroke-width="1"/>

  <!-- Decorative circle -->
  <circle cx="200" cy="180" r="60" fill="none" stroke="${badge.color}" stroke-width="1.5" opacity="0.3" filter="url(#glow)"/>
  <circle cx="200" cy="180" r="45" fill="${badge.color}10" stroke="${badge.color}44" stroke-width="1"/>

  <!-- Icon -->
  <g transform="translate(188, 168) scale(1)">
    <path d="${badge.icon}" fill="none" stroke="${badge.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Week number -->
  <text x="200" y="270" text-anchor="middle" font-family="monospace" font-size="12" fill="#52525b" letter-spacing="0.15em">WEEK ${week}</text>

  <!-- Title -->
  <text x="200" y="305" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="28" fill="${badge.color}" letter-spacing="0.08em">${badge.title}</text>

  <!-- Subtitle -->
  <text x="200" y="335" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#71717a">${badge.subtitle}</text>

  <!-- Divider -->
  <line x1="100" y1="370" x2="300" y2="370" stroke="#27272a" stroke-width="1"/>

  <!-- TURBO branding -->
  <text x="200" y="405" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="14" fill="#06b6d4" letter-spacing="0.2em">TURBO</text>
  <text x="200" y="425" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#3f3f46" letter-spacing="0.1em">by EmpowerTours</text>

  <!-- Wallet + date -->
  <text x="200" y="460" text-anchor="middle" font-family="monospace" font-size="11" fill="#3f3f46">${shortAddr}</text>
  <text x="200" y="480" text-anchor="middle" font-family="monospace" font-size="10" fill="#27272a">${dateStr}</text>
</svg>`;
}

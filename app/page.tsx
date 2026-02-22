'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { monad } from '@/lib/monad';
import {
  WMON_ADDRESS,
  TURBO_COHORT_ADDRESS,
  WMON_ABI,
  TURBO_COHORT_ABI,
  TIERS,
} from '@/lib/contracts';

const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

/* ── Data ── */

const PHASES = [
  {
    num: '01',
    months: '1 – 4',
    title: 'Foundations',
    accent: '#06b6d4',
    items: [
      'Web3 fundamentals & Monad ecosystem',
      'Product discovery & validation',
      'Smart contract development basics',
      'Team formation & culture building',
    ],
  },
  {
    num: '02',
    months: '5 – 8',
    title: 'Build & Ship',
    accent: '#8b5cf6',
    items: [
      'MVP development sprints',
      'User acquisition strategies',
      'Tokenomics & governance design',
      'Technical architecture reviews',
    ],
  },
  {
    num: '03',
    months: '9 – 12',
    title: 'Scale & Demo',
    accent: '#f59e0b',
    items: [
      'Growth hacking & metrics',
      'Pitch deck refinement',
      'Demo Day preparation',
      'NITRO application coaching',
    ],
  },
] as const;

const FAQS = [
  {
    q: 'Who is TURBO for?',
    a: 'Aspiring Web3 founders in Latin America who want structured mentorship, community, and a path to building real products. Whether you\'re a developer, designer, or business mind — if you want to build on Monad, TURBO is your launchpad.',
  },
  {
    q: 'What happens after the 12 months?',
    a: 'Graduates will be well-prepared to apply for Monad\'s NITRO, which provides $500,000 USD per team. TURBO gives you the skills, portfolio, and network to stand out.',
  },
  {
    q: 'How do I become a TURBO candidate?',
    a: 'Step 1: Register on Bybit using referral code BPYPARJ. Step 2: Join the EmpowerToursEdu Telegram channel. Step 3: Fill out the application form on this page.',
  },
  {
    q: 'Is TURBO only in Spanish?',
    a: 'Primary content is in Spanish with English resources available. Mentorship sessions can be in either language. We believe in building bridges between LATAM and global Web3.',
  },
  {
    q: 'What\'s the difference between TURBO and NITRO?',
    a: 'TURBO is the training ground. NITRO is the destination. TURBO (by EmpowerTours) builds your skills and community over 12 months. NITRO (by Monad) is a 3-month elite program with $500K USD for 15 selected teams.',
  },
  {
    q: 'Do I need coding experience?',
    a: 'No. TURBO is designed to take you from zero to builder. With AI-powered vibe coding, anyone with drive can build real products. We\'ll teach you everything you need.',
  },
];

const STEPS = [
  {
    num: '01',
    color: '#f59e0b',
    title: 'Register on Bybit',
    desc: 'Create your Bybit account using our referral code to become a TURBO candidate.',
    cta: 'Use code: BPYPARJ',
    link: '#',
  },
  {
    num: '02',
    color: '#06b6d4',
    title: 'Join Telegram',
    desc: 'Enter the EmpowerToursEdu channel — your hub for updates, community, and resources.',
    cta: 'Join channel',
    link: 'https://t.me/+D2lwIqbJT1tmZTMx',
  },
  {
    num: '03',
    color: '#8b5cf6',
    title: 'Apply below',
    desc: 'Fill out the application form and tell us what you want to build. We\'ll take it from there.',
    cta: 'Scroll to apply',
    link: '#apply',
  },
];

/* ── Scroll reveal hook ── */

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('visible');
          obs.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── Check icon ── */

function Check({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Label ── */

function Label({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="syne inline-block text-[11px] font-semibold tracking-[0.15em] uppercase mb-6"
      style={{ color }}
    >
      {children}
    </span>
  );
}

/* ── Helpers ── */

// Minimal ABI encoding for approve(address,uint256) and payMonthly(uint8)
function encodeFunctionCall(fn: string, args: (string | number)[]): string {
  if (fn === 'approve') {
    // approve(address,uint256)
    const selector = '0x095ea7b3';
    const addr = (args[0] as string).slice(2).padStart(64, '0');
    const amount = (args[1] as string).slice(2).padStart(64, '0');
    return selector + addr + amount;
  }
  if (fn === 'payMonthly') {
    // payMonthly(uint8)
    const selector = '0x4b7f039b';
    const tier = (args[0] as number).toString(16).padStart(64, '0');
    return selector + tier;
  }
  return '0x';
}

async function waitForTx(hash: string): Promise<void> {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: hash as `0x${string}`,
  });
  if (receipt.status === 'reverted') {
    throw new Error('Transaction reverted');
  }
}

/* ── Page ── */

export default function TurboPage() {
  const { login, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', twitter: '', bybit: '', why: '', tier: 'builder' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [boost, setBoost] = useState(0);
  const [openCode, setOpenCode] = useState<number | null>(null);

  // On-chain payment state
  const [payStep, setPayStep] = useState<'idle' | 'approving' | 'paying' | 'success' | 'error'>('idle');
  const [payError, setPayError] = useState('');
  const [payResult, setPayResult] = useState<{ txHash: string; amount: string } | null>(null);
  const [wmonBalance, setWmonBalance] = useState<string | null>(null);
  const [tierPrice, setTierPrice] = useState<bigint | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const connectedWallet = wallets[0];
  const walletAddress = connectedWallet?.address as Address | undefined;

  // Fetch WMON balance and tier price when wallet connects or tier changes
  const fetchBalanceAndPrice = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const [balance, price] = await Promise.all([
        publicClient.readContract({
          address: WMON_ADDRESS,
          abi: WMON_ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
        }),
        publicClient.readContract({
          address: TURBO_COHORT_ADDRESS,
          abi: TURBO_COHORT_ABI,
          functionName: 'tierPrice',
          args: [TIERS[form.tier]],
        }),
      ]);
      setWmonBalance(formatUnits(balance, 18));
      setTierPrice(price);
    } catch {
      // silently fail
    }
  }, [walletAddress, form.tier]);

  useEffect(() => {
    fetchBalanceAndPrice();
  }, [fetchBalanceAndPrice]);

  const handlePayment = async () => {
    if (!walletAddress || !connectedWallet || !tierPrice) return;

    setPayStep('approving');
    setPayError('');

    try {
      // Get the wallet provider
      const provider = await connectedWallet.getEthereumProvider();

      // Check current allowance
      const allowance = await publicClient.readContract({
        address: WMON_ADDRESS,
        abi: WMON_ABI,
        functionName: 'allowance',
        args: [walletAddress, TURBO_COHORT_ADDRESS],
      });

      // Approve if needed
      if (allowance < tierPrice) {
        const approveTx = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: WMON_ADDRESS,
            data: encodeFunctionCall('approve', [TURBO_COHORT_ADDRESS, '0x' + tierPrice.toString(16)]),
          }],
        });

        // Wait for approval confirmation
        await waitForTx(approveTx as string);
      }

      setPayStep('paying');

      // Send payMonthly transaction
      const tierNum = TIERS[form.tier];
      const payTx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: TURBO_COHORT_ADDRESS,
          data: encodeFunctionCall('payMonthly', [tierNum]),
        }],
      });

      // Wait for payment confirmation
      await waitForTx(payTx as string);

      setPayResult({ txHash: payTx as string, amount: formatUnits(tierPrice, 18) });
      setPayStep('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setPayError(message.includes('user rejected') ? 'Transaction was rejected.' : message);
      setPayStep('error');
    }
  };

  useEffect(() => {
    document.body.style.backgroundColor = '#060608';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      setBoost(Math.min(Math.max(pct, 0), 1));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="turbo-page">
      {/* Scroll progress */}
      <div className="boost-bar">
        <div className="boost-fill" style={{ height: `${boost * 100}%` }} />
      </div>

      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#060608]/80 backdrop-blur-md border-b border-zinc-900/50">
        <span className="syne text-sm font-bold gt">TURBO</span>
        <a href="/status" className="syne text-[11px] font-semibold tracking-[0.1em] uppercase text-zinc-500 hover:text-cyan-400 transition-colors">
          Already applied? Pay here
        </a>
      </nav>

      {/* HERO */}
      <header className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="orb" style={{ width: 500, height: 500, background: '#06b6d4', opacity: 0.08, top: '-5%', left: '15%' }} />
        <div className="orb" style={{ width: 400, height: 400, background: '#8b5cf6', opacity: 0.06, bottom: '5%', right: '10%' }} />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <p className="syne hero-enter hero-enter-d1 text-[11px] tracking-[0.4em] uppercase text-zinc-600 font-semibold mb-8">
            by EmpowerTours
          </p>

          <h1
            className="syne hero-enter hero-enter-d2 font-extrabold leading-[0.9] mb-6"
            style={{ fontSize: 'clamp(4.5rem, 14vw, 12rem)' }}
          >
            <span className="gt">TURBO</span>
          </h1>

          <p className="hero-enter hero-enter-d3 text-lg md:text-xl text-zinc-500 mb-10 max-w-md mx-auto">
            The launchpad to <span className="syne font-bold text-purple-400">NITRO</span>.
            <br />
            <span className="text-zinc-600">Train. Build. Fund.</span>
          </p>

          {/* Stats */}
          <div className="hero-enter hero-enter-d4 flex flex-wrap justify-center gap-10 md:gap-16 mb-12">
            {[
              { v: '12', l: 'Months' },
              { v: 'LATAM', l: 'First' },
              { v: 'AI', l: 'Powered' },
              { v: '$500K', l: 'USD via NITRO' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="syne text-2xl md:text-3xl font-bold gt">{s.v}</div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-700 mt-1">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="hero-enter hero-enter-d4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#register" className="cta-primary">Get Started</a>
            <a href="#about" className="cta-secondary">Learn More</a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-800 flex flex-col items-center gap-2">
          <div className="w-px h-10 bg-gradient-to-b from-zinc-700/50 to-transparent" />
        </div>
      </header>

      {/* ABOUT */}
      <section id="about" className="py-28 md:py-36 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <Label color="#06b6d4">What is TURBO</Label>
            <h2 className="syne text-3xl md:text-5xl font-bold text-white leading-tight mb-8">
              Your <span className="gt">12-month</span> runway<br className="hidden md:block" />
              to Web3 mastery.
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="grid md:grid-cols-2 gap-8 text-zinc-400 text-[15px] leading-relaxed mb-14">
              <p>
                TURBO is EmpowerTours&apos; intensive 12-month program designed for aspiring Web3 founders in Latin America. Go from idea to product — with mentorship, community, and real support behind you.
              </p>
              <p>
                The end goal? Graduates emerge ready to apply for Monad&apos;s{' '}
                <span className="text-purple-400 font-medium">NITRO</span>,
                which awards <span className="text-amber-400 font-medium">$500,000 USD</span> per team. TURBO is the training ground. NITRO is the destination.
              </p>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="grid sm:grid-cols-3 gap-5">
              {[
                { title: 'Community-powered', desc: 'A collective of builders funding and supporting each other', color: '#06b6d4' },
                { title: 'NITRO-aligned', desc: 'Curriculum mirrors what NITRO selectors look for', color: '#8b5cf6' },
                { title: 'LATAM-first', desc: 'Built for Latin American founders, taught in Spanish & English', color: '#f59e0b' },
              ].map((item) => (
                <div key={item.title} className="p-5 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
                  <div className="w-2 h-2 rounded-full mb-4" style={{ background: item.color }} />
                  <div className="syne font-bold text-white text-sm mb-1">{item.title}</div>
                  <div className="text-xs text-zinc-500 leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="divider mx-6" />

      {/* PROGRAM STRUCTURE */}
      <section className="py-28 md:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <Label color="#8b5cf6">Program Structure</Label>
            <h2 className="syne text-3xl md:text-5xl font-bold text-white leading-tight mb-14">
              Three phases. <span className="gt">One trajectory.</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {PHASES.map((phase, i) => (
              <Reveal key={phase.num} delay={i * 120}>
                <div className="phase-card" style={{ '--accent-color': phase.accent } as React.CSSProperties}>
                  <div className="syne text-[10px] tracking-[0.2em] uppercase text-zinc-600 mb-1">
                    Months {phase.months}
                  </div>
                  <div className="flex items-baseline gap-3 mb-5">
                    <span className="syne text-4xl font-extrabold" style={{ color: phase.accent, opacity: 0.15 }}>
                      {phase.num}
                    </span>
                    <h3 className="syne text-xl font-bold text-white">{phase.title}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {phase.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[13px] text-zinc-400">
                        <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: phase.accent }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="divider mx-6" />

      {/* TIERED PRICING */}
      <section className="py-28 md:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <Label color="#f59e0b">Membership Tiers</Label>
            <h2 className="syne text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
              Choose your <span className="gt">level.</span>
            </h2>
            <p className="text-zinc-500 text-[15px] mb-14 max-w-lg">
              Every tier gets you closer to NITRO. Your monthly contribution fuels the community pool that funds graduating founders.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Explorer */}
            <Reveal delay={0}>
              <div className="tier-card">
                <div className="w-2 h-2 rounded-full mb-4" style={{ background: '#06b6d4' }} />
                <div className="syne text-[10px] tracking-[0.2em] uppercase text-zinc-600 mb-1">Tier 1</div>
                <h3 className="syne text-xl font-bold text-white mb-1">Explorer</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="syne text-3xl font-extrabold" style={{ color: '#06b6d4' }}>$50</span>
                  <span className="text-zinc-600 text-sm">MXN/mo</span>
                </div>
                <ul className="space-y-3 flex-1">
                  {['Community access', 'Weekly workshops', 'Discord channels', 'Monthly AMAs'].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] text-zinc-400">
                      <Check color="#06b6d4" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#apply" className="cta-secondary w-full mt-8 text-center">Join as Explorer</a>
              </div>
            </Reveal>

            {/* Builder */}
            <Reveal delay={120}>
              <div className="tier-card popular">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="syne text-[9px] font-bold tracking-[0.15em] uppercase bg-purple-500 text-black px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
                <div className="w-2 h-2 rounded-full mb-4" style={{ background: '#8b5cf6' }} />
                <div className="syne text-[10px] tracking-[0.2em] uppercase text-zinc-600 mb-1">Tier 2</div>
                <h3 className="syne text-xl font-bold text-white mb-1">Builder</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="syne text-3xl font-extrabold" style={{ color: '#8b5cf6' }}>$200</span>
                  <span className="text-zinc-600 text-sm">MXN/mo</span>
                </div>
                <ul className="space-y-3 flex-1">
                  {[
                    'Everything in Explorer',
                    '1:1 mentorship sessions',
                    'Code reviews & feedback',
                    'Builder cohort channels',
                    'Priority NITRO prep',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] text-zinc-400">
                      <Check color="#8b5cf6" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#apply" className="cta-primary w-full mt-8 text-center">Join as Builder</a>
              </div>
            </Reveal>

            {/* Founder */}
            <Reveal delay={240}>
              <div className="tier-card">
                <div className="w-2 h-2 rounded-full mb-4" style={{ background: '#f59e0b' }} />
                <div className="syne text-[10px] tracking-[0.2em] uppercase text-zinc-600 mb-1">Tier 3</div>
                <h3 className="syne text-xl font-bold text-white mb-1">Founder</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="syne text-3xl font-extrabold" style={{ color: '#f59e0b' }}>$500</span>
                  <span className="text-zinc-600 text-sm">MXN/mo</span>
                </div>
                <ul className="space-y-3 flex-1">
                  {[
                    'Everything in Builder',
                    'Direct funding eligibility',
                    'VC introductions',
                    'Demo Day slot',
                    'NITRO application support',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] text-zinc-400">
                      <Check color="#f59e0b" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#apply" className="cta-secondary w-full mt-8 text-center">Join as Founder</a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="divider mx-6" />

      {/* TURBO -> NITRO */}
      <section className="py-28 md:py-36 px-6 relative overflow-hidden">
        <div className="orb" style={{ width: 600, height: 300, background: '#8b5cf6', opacity: 0.04, top: '30%', left: '50%', transform: 'translateX(-50%)' }} />

        <div className="max-w-4xl mx-auto relative z-10">
          <Reveal>
            <Label color="#06b6d4">The Pipeline</Label>
            <h2 className="syne text-3xl md:text-5xl font-bold text-white leading-tight mb-14">
              From <span className="gt">TURBO</span> to <span className="text-purple-400">NITRO</span>.
            </h2>
          </Reveal>

          <Reveal delay={150}>
            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
              <div className="pipeline-box" style={{ borderColor: 'rgba(6,182,212,0.15)' }}>
                <div className="syne text-2xl font-extrabold gt mb-1">TURBO</div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-600 mb-5">By EmpowerTours</div>
                <ul className="space-y-2 text-[13px] text-zinc-400">
                  <li>12-month program</li>
                  <li>Community-funded</li>
                  <li>Mentorship + community</li>
                  <li>LATAM-focused</li>
                </ul>
              </div>

              <div className="hidden md:flex flex-col items-center justify-center gap-1 px-2">
                <div className="text-[9px] tracking-[0.15em] uppercase text-zinc-700 syne">Graduate</div>
                <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
                  <path d="M0 8h32M28 3l6 5-6 5" stroke="#52525b" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-[9px] tracking-[0.15em] uppercase text-zinc-700 syne">Apply</div>
              </div>

              <div className="pipeline-box" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
                <div className="syne text-2xl font-extrabold text-purple-400 mb-1">NITRO</div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-600 mb-5">By Monad</div>
                <ul className="space-y-2 text-[13px] text-zinc-400">
                  <li>3-month elite program</li>
                  <li className="text-amber-400 font-medium">$500,000 USD per team</li>
                  <li>15 selected teams worldwide</li>
                  <li>Top-tier VC access</li>
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="divider mx-6" />

      {/* FUNDING MODEL */}
      <section className="py-28 md:py-36 px-6 relative overflow-hidden">
        <div className="orb" style={{ width: 500, height: 300, background: '#f59e0b', opacity: 0.03, top: '20%', right: '10%' }} />

        <div className="max-w-4xl mx-auto relative z-10">
          <Reveal>
            <Label color="#f59e0b">Funding Model</Label>
            <h2 className="syne text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
              Community-powered <span className="gt">capital.</span>
            </h2>
            <p className="text-zinc-500 text-[15px] mb-14 max-w-xl">
              TURBO is not venture-backed. It&apos;s collectively funded by its own members. Every monthly payment feeds the Founders Club pool.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="p-8 md:p-12 rounded-2xl border border-zinc-800/60 bg-zinc-900/20 text-center">
              <div className="syne text-5xl md:text-7xl font-extrabold gt mb-3">500,000</div>
              <div className="syne text-lg md:text-xl font-bold text-zinc-400 mb-8">MXN Founders Club Pool</div>

              <div className="grid sm:grid-cols-3 gap-6 text-center mb-10">
                <div>
                  <div className="syne text-2xl font-bold text-white">340</div>
                  <div className="text-[11px] tracking-[0.12em] uppercase text-zinc-600 mt-1">Members contribute</div>
                </div>
                <div>
                  <div className="syne text-2xl font-bold text-white">12</div>
                  <div className="text-[11px] tracking-[0.12em] uppercase text-zinc-600 mt-1">Months of payments</div>
                </div>
                <div>
                  <div className="syne text-2xl font-bold text-white">~5</div>
                  <div className="text-[11px] tracking-[0.12em] uppercase text-zinc-600 mt-1">Founders funded</div>
                </div>
              </div>

              <div className="max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-2 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '95%', background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)' }} />
                  </div>
                  <span className="syne text-[11px] font-bold text-zinc-500">95%</span>
                </div>
                <div className="flex justify-between text-[10px] tracking-[0.1em] uppercase text-zinc-700">
                  <span>Community Pool</span>
                  <span>5% Treasury</span>
                </div>
              </div>

              <p className="text-[13px] text-zinc-600 mt-8 max-w-sm mx-auto leading-relaxed">
                Each graduating founder receives ~100,000 MXN from the community pool to launch their project.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="divider mx-6" />

      {/* SMART CONTRACT */}
      <section id="contract" className="py-28 md:py-36 px-6 relative overflow-hidden">
        <div className="orb" style={{ width: 500, height: 400, background: '#06b6d4', opacity: 0.03, top: '10%', left: '5%' }} />

        <div className="max-w-4xl mx-auto relative z-10">
          <Reveal>
            <Label color="#06b6d4">On-Chain Transparency</Label>
            <h2 className="syne text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
              Every peso on the <span className="gt">blockchain.</span>
            </h2>
            <p className="text-zinc-500 text-[15px] mb-14 max-w-xl">
              TURBO runs on a verified smart contract on Monad. All payments, pool balances, and founder distributions are publicly auditable. No trust required — just code.
            </p>
          </Reveal>

          {/* Contract flow */}
          <Reveal delay={100}>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {[
                {
                  step: '01',
                  title: 'Member Pays',
                  color: '#06b6d4',
                  desc: 'Monthly WMON payment via payMonthly(). Soulbound NFT membership card minted on first payment.',
                },
                {
                  step: '02',
                  title: 'Funds Split',
                  color: '#8b5cf6',
                  desc: '95% goes to the Community Pool held in the contract. 5% goes to the EmpowerTours treasury.',
                },
                {
                  step: '03',
                  title: 'Founders Funded',
                  color: '#f59e0b',
                  desc: 'After 12 months, graduating founders are selected and receive WMON directly from the pool.',
                },
              ].map((item, i) => (
                <Reveal key={item.step} delay={i * 120}>
                  <div className="p-5 rounded-xl border border-zinc-800/60 bg-zinc-900/20 h-full">
                    <span className="syne text-3xl font-extrabold" style={{ color: item.color, opacity: 0.15 }}>
                      {item.step}
                    </span>
                    <h3 className="syne text-sm font-bold text-white mt-2 mb-2">{item.title}</h3>
                    <p className="text-[12px] text-zinc-500 leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          {/* Math breakdown */}
          <Reveal delay={200}>
            <div className="p-6 md:p-8 rounded-2xl border border-zinc-800/60 bg-zinc-900/20 mb-8">
              <div className="syne text-sm font-bold text-white mb-5">The Math: How We Reach 500,000 MXN</div>

              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {[
                  { tier: 'Explorer', price: '$50', wmon: '139', color: '#06b6d4', members: '200' },
                  { tier: 'Builder', price: '$200', wmon: '556', color: '#8b5cf6', members: '100' },
                  { tier: 'Founder', price: '$500', wmon: '1,389', color: '#f59e0b', members: '40' },
                ].map((t) => (
                  <div key={t.tier} className="p-4 rounded-lg border border-zinc-800/40 bg-zinc-900/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                      <span className="syne text-xs font-bold text-white">{t.tier}</span>
                    </div>
                    <div className="text-[12px] text-zinc-500 space-y-1">
                      <div className="flex justify-between">
                        <span>MXN/mo</span>
                        <span className="text-zinc-400">{t.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WMON/mo</span>
                        <span className="text-zinc-400">{t.wmon}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Target members</span>
                        <span className="text-zinc-400">{t.members}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg border border-cyan-500/10 bg-cyan-500/[0.02] text-[12px] text-zinc-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>200 Explorers &times; $50 &times; 12 mo</span>
                  <span className="text-zinc-300">120,000 MXN</span>
                </div>
                <div className="flex justify-between">
                  <span>100 Builders &times; $200 &times; 12 mo</span>
                  <span className="text-zinc-300">240,000 MXN</span>
                </div>
                <div className="flex justify-between">
                  <span>40 Founders &times; $500 &times; 12 mo</span>
                  <span className="text-zinc-300">240,000 MXN</span>
                </div>
                <div className="border-t border-zinc-800/60 my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total collected</span>
                  <span className="text-white">600,000 MXN</span>
                </div>
                <div className="flex justify-between">
                  <span>Treasury (5%)</span>
                  <span className="text-zinc-300">-30,000 MXN</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="gt">Community Pool (95%)</span>
                  <span className="gt">570,000 MXN</span>
                </div>
                <div className="border-t border-zinc-800/60 my-2" />
                <div className="flex justify-between">
                  <span>~5 graduating founders &times; ~100K each</span>
                  <span className="text-amber-400 font-medium">~500,000 MXN</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Remaining buffer</span>
                  <span>~70,000 MXN</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Interactive code walkthrough */}
          <Reveal delay={300}>
            <div className="mb-8">
              <div className="syne text-sm font-bold text-white mb-4">Code Walkthrough: TurboCohortV6.sol</div>
              <div className="space-y-2">
                {([
                  {
                    title: 'payMonthly() — The Core Payment Function',
                    color: '#06b6d4',
                    lines: [
                      { num: 259, code: 'function payMonthly(Tier tier) external nonReentrant {', note: 'Entry point for all payments. nonReentrant prevents reentrancy attacks.' },
                      { num: 261, code: '    require(c.active, "no active cohort");', note: 'Can only pay during an active cohort period.' },
                      { num: 263, code: '    require(!m.banned, "member banned");', note: 'Banned members are blocked from further payments.' },
                      { num: 267, code: '    if (m.tier == Tier.None) {', note: 'First-time payer? Auto-register them as a new member.' },
                      { num: 269, code: '        m.tier = tier;', note: 'Their chosen tier (Explorer/Builder/Founder) is locked in.' },
                      { num: 278, code: '    require(m.monthsPaid < MAX_PAYMENTS, "max payments reached");', note: 'Hard cap at 12 monthly payments. Contract enforced — no overpaying.' },
                      { num: 280, code: '    require(block.timestamp >= m.lastPaymentTime + MIN_PAYMENT_INTERVAL,', note: '25-day minimum between payments prevents double-charging.' },
                    ],
                  },
                  {
                    title: '95/5 Fee Split — Where Your Money Goes',
                    color: '#8b5cf6',
                    lines: [
                      { num: 50, code: 'uint256 public constant TREASURY_FEE_BPS = 500; // 5%', note: 'Treasury fee is hardcoded at 5%. Cannot be changed — ever.' },
                      { num: 286, code: 'uint256 price = tierPrice[m.tier];', note: 'Reads the current WMON price for the member\'s tier.' },
                      { num: 287, code: 'require(price > 0, "tier price not set");', note: 'Safety check — prevents payments if prices aren\'t configured.' },
                      { num: 290, code: 'uint256 fee = (price * TREASURY_FEE_BPS) / BPS_DENOMINATOR;', note: 'Calculates 5% treasury fee. e.g. 139 WMON × 5% = 6.95 WMON.' },
                      { num: 291, code: 'uint256 toPool = price - fee;', note: 'Remaining 95% goes to the community pool. e.g. 132.05 WMON.' },
                      { num: 311, code: 'wmon.safeTransferFrom(msg.sender, treasury, fee);', note: '5% sent to treasury wallet. SafeERC20 ensures transfer succeeds.' },
                      { num: 312, code: 'wmon.safeTransferFrom(msg.sender, address(this), toPool);', note: '95% locked in the contract. Held until founder distribution.' },
                    ],
                  },
                  {
                    title: 'Soulbound NFT — Your Membership Card',
                    color: '#f59e0b',
                    lines: [
                      { num: 301, code: 'uint256 mintedTokenId = 0;', note: 'NFT only minted on first payment — one card per member.' },
                      { num: 302, code: 'if (m.tokenId == 0) {', note: 'Check if member already has a card. No duplicates.' },
                      { num: 303, code: '    _nextTokenId++;', note: 'Sequential token IDs. Each card is unique.' },
                      { num: 316, code: '    _mint(msg.sender, mintedTokenId);', note: 'Uses _mint (not _safeMint) — soulbound, no callback needed.' },
                      { num: 450, code: 'require(from == address(0) || to == address(0), "soulbound: non-transferable");', note: 'Cards cannot be transferred or sold. Yours forever on Monad.' },
                      { num: 455, code: 'function tokenURI(uint256 tokenId) public view override returns (string memory) {', note: 'On-chain SVG art. No IPFS dependency — fully on Monad.' },
                    ],
                  },
                  {
                    title: 'selectFounders() — Pool Distribution',
                    color: '#06b6d4',
                    lines: [
                      { num: 356, code: 'function selectFounders(uint256 cohortId, address[] calldata founders, uint256[] calldata amounts)', note: 'Owner selects graduating founders and how much each receives.' },
                      { num: 366, code: 'require(!c.active, "cohort still active");', note: 'Distribution only after the cohort ends. No early withdrawals.' },
                      { num: 374, code: 'require(m.monthsPaid > 0, "never paid");', note: 'Only members who actually paid can be selected as founders.' },
                      { num: 375, code: 'require(!m.isFounder, "already selected");', note: 'Each founder can only be selected once. No double-dipping.' },
                      { num: 378, code: 'require(amount <= c.poolBalance, "exceeds pool balance");', note: 'Cannot distribute more than what\'s in the pool.' },
                      { num: 380, code: 'c.poolBalance -= amount;', note: 'Pool balance decremented. On-chain accounting.' },
                      { num: 384, code: 'wmon.safeTransfer(founders[i], amount);', note: 'WMON sent directly from contract to founder\'s wallet.' },
                    ],
                  },
                  {
                    title: 'Security — 4 Layers of Protection',
                    color: '#8b5cf6',
                    lines: [
                      { num: 4, code: 'import "@openzeppelin/contracts/access/Ownable2Step.sol";', note: '2-step ownership transfer. Prevents accidental owner change.' },
                      { num: 8, code: 'import "@openzeppelin/contracts/security/ReentrancyGuard.sol";', note: 'Blocks reentrancy attacks on payment and distribution functions.' },
                      { num: 6, code: 'import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";', note: 'Safe token transfers that revert on failure instead of returning false.' },
                      { num: 52, code: 'uint256 public constant MAX_TIER_PRICE = 2000 ether;', note: 'Price cap at 2000 WMON. Prevents owner from setting absurd prices.' },
                      { num: 176, code: 'require(explorer <= builder && builder <= founder, "invalid tier ordering");', note: 'Enforces Explorer < Builder < Founder pricing. Always.' },
                      { num: 293, code: '// Update state BEFORE external calls (checks-effects-interactions)', note: 'State updated before any token transfer. Industry-standard security pattern.' },
                    ],
                  },
                ] as const).map((section, i) => (
                  <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 overflow-hidden">
                    <button
                      onClick={() => setOpenCode(openCode === i ? null : i)}
                      className="w-full flex items-center justify-between gap-4 p-4 text-left bg-transparent border-none cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: section.color }} />
                        <span className="syne font-semibold text-[13px] text-zinc-300">{section.title}</span>
                      </div>
                      <svg
                        width="14" height="14" viewBox="0 0 16 16" fill="none"
                        className="flex-shrink-0 transition-transform duration-300"
                        style={{ transform: openCode === i ? 'rotate(45deg)' : 'none' }}
                      >
                        <path d="M8 3v10M3 8h10" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    <div
                      className="transition-all duration-300 overflow-hidden"
                      style={{
                        maxHeight: openCode === i ? '800px' : '0',
                        opacity: openCode === i ? 1 : 0,
                      }}
                    >
                      <div className="px-4 pb-4 space-y-1">
                        {section.lines.map((line, j) => (
                          <div key={j} className="group rounded-lg hover:bg-zinc-800/30 transition-colors">
                            <div className="flex gap-3 p-2">
                              <span className="text-[10px] font-mono text-zinc-700 w-8 flex-shrink-0 text-right pt-0.5">
                                L{line.num}
                              </span>
                              <div className="min-w-0 flex-1">
                                <code className="block text-[11px] font-mono text-cyan-400/80 whitespace-pre-wrap break-all leading-relaxed">
                                  {line.code}
                                </code>
                                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                                  {line.note}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Contract link */}
          <Reveal delay={400}>
            <div className="text-center">
              <a
                href="https://monadscan.com/address/0xEae06514a0d3daf610cC0778B27f387018521Ab5"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 syne text-[11px] font-bold tracking-[0.1em] uppercase py-3 px-6 rounded-lg bg-cyan-500/10 text-cyan-400 hover:brightness-110 transition-all"
              >
                <span>View Contract on MonadScan</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <p className="text-[10px] text-zinc-800 mt-3">
                TurboCohortV6 &middot; 0xEae0...1Ab5 &middot; Verified on Monad
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="divider mx-6" />

      {/* HOW TO REGISTER */}
      <section id="register" className="py-28 md:py-36 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <Label color="#f59e0b">How to Join</Label>
            <h2 className="syne text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
              Three steps to <span className="gt">get started.</span>
            </h2>
            <p className="text-zinc-500 text-[15px] mb-14 max-w-lg">
              Becoming a TURBO candidate is simple. Complete these steps and you&apos;re in the pipeline.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 120}>
                <div className="phase-card" style={{ '--accent-color': step.color } as React.CSSProperties}>
                  <span className="syne text-4xl font-extrabold" style={{ color: step.color, opacity: 0.15 }}>
                    {step.num}
                  </span>
                  <h3 className="syne text-lg font-bold text-white mt-2 mb-3">{step.title}</h3>
                  <p className="text-[13px] text-zinc-500 leading-relaxed mb-5">{step.desc}</p>
                  <a
                    href={step.link}
                    target={step.link.startsWith('http') ? '_blank' : undefined}
                    rel={step.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-block syne text-[11px] font-bold tracking-[0.08em] uppercase py-2 px-4 rounded-lg transition-all duration-200 hover:brightness-110"
                    style={{ background: `${step.color}15`, color: step.color }}
                  >
                    {step.cta}
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="divider mx-6" />

      {/* FAQ */}
      <section className="py-28 md:py-36 px-6">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <Label color="#71717a">FAQ</Label>
            <h2 className="syne text-3xl md:text-4xl font-bold text-white mb-10">
              Got questions?
            </h2>
          </Reveal>

          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="faq-item">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left bg-transparent border-none cursor-pointer"
                  >
                    <span className="syne font-semibold text-[14px] text-zinc-300">{faq.q}</span>
                    <svg
                      width="16" height="16" viewBox="0 0 16 16" fill="none"
                      className="flex-shrink-0 transition-transform duration-300"
                      style={{ transform: openFaq === i ? 'rotate(45deg)' : 'none' }}
                    >
                      <path d="M8 3v10M3 8h10" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  <div className={`faq-answer ${openFaq === i ? 'open' : ''}`}>
                    <p className="text-[13px] text-zinc-500 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="divider mx-6" />

      {/* APPLY */}
      <section id="apply" className="py-28 md:py-36 px-6 relative">
        <div className="orb" style={{ width: 400, height: 400, background: '#06b6d4', opacity: 0.04, bottom: 0, left: '50%', transform: 'translateX(-50%)' }} />

        <div className="max-w-lg mx-auto relative z-10">
          <Reveal>
            <div className="text-center mb-10">
              <Label color="#06b6d4">Apply</Label>
              <h2 className="syne text-3xl md:text-4xl font-bold text-white mb-3">
                Ready to go <span className="gt">full throttle?</span>
              </h2>
              <p className="text-zinc-600 text-sm">Cohort 1 applications are open. Limited spots.</p>
            </div>
          </Reveal>

          {submitted ? (
            <Reveal>
              <div className="text-center p-8 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.03] mb-6">
                <div className="syne text-xl font-bold gt mb-2">Application Received</div>
                <p className="text-zinc-500 text-sm mb-4">
                  We&apos;ll review your application and get back to you within 48 hours.
                  Make sure you&apos;ve completed steps 1 &amp; 2 above!
                </p>
                <p className="text-zinc-600 text-xs">
                  You can return to pay anytime at{' '}
                  <a href="/status" className="text-cyan-500 hover:text-cyan-400 transition-colors underline underline-offset-2">
                    /status
                  </a>
                </p>
              </div>

              {/* On-chain payment section */}
              <div className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                <div className="syne text-sm font-bold text-white mb-1">Make Your First Payment</div>
                <p className="text-zinc-600 text-[12px] mb-5">
                  Pay your monthly {form.tier.charAt(0).toUpperCase() + form.tier.slice(1)} tier fee in WMON on Monad.
                </p>

                {payStep === 'success' && payResult ? (
                  <div className="text-center p-6 rounded-xl border border-green-500/15 bg-green-500/[0.03]">
                    <div className="syne text-lg font-bold text-green-400 mb-1">Payment Confirmed</div>
                    <p className="text-zinc-500 text-xs mb-3">{payResult.amount} WMON paid. Your membership NFT has been minted.</p>
                    <a
                      href={`https://monadscan.com/tx/${payResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[11px] syne font-bold tracking-[0.08em] uppercase py-2 px-4 rounded-lg bg-green-500/10 text-green-400 hover:brightness-110 transition-all"
                    >
                      View on MonadScan
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Wallet connection via Privy */}
                    {ready && !authenticated ? (
                      <button
                        type="button"
                        onClick={login}
                        className="cta-primary w-full"
                      >
                        Connect Wallet
                      </button>
                    ) : walletAddress ? (
                      <>
                        <div className="p-3 rounded-lg border border-zinc-800/40 bg-zinc-900/30 text-[12px]">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-zinc-600">Wallet</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(walletAddress);
                                setCopiedWallet(true);
                                setTimeout(() => setCopiedWallet(false), 2000);
                              }}
                              className="text-zinc-400 font-mono text-[10px] hover:text-cyan-400 transition-colors cursor-pointer bg-transparent border-none p-0"
                              title={walletAddress}
                            >
                              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} {copiedWallet ? '\u2713' : '\u{1F4CB}'}
                            </button>
                          </div>
                          {wmonBalance !== null && (
                            <div className="flex justify-between mb-1">
                              <span className="text-zinc-600">WMON Balance</span>
                              <span className="text-zinc-400">{parseFloat(wmonBalance).toFixed(4)} WMON</span>
                            </div>
                          )}
                          {tierPrice !== null && (
                            <div className="flex justify-between">
                              <span className="text-zinc-600">Tier Price</span>
                              <span className="text-zinc-400">{formatUnits(tierPrice, 18)} WMON</span>
                            </div>
                          )}
                        </div>

                        {tierPrice !== null && wmonBalance !== null && parseFloat(wmonBalance) < parseFloat(formatUnits(tierPrice, 18)) && (
                          <div className="text-amber-400 text-sm text-center p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            You need {formatUnits(tierPrice, 18)} WMON. Current balance: {parseFloat(wmonBalance).toFixed(4)} WMON
                          </div>
                        )}

                        {payError && (
                          <div className="text-red-400 text-sm text-center p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                            {payError}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handlePayment}
                          disabled={payStep === 'approving' || payStep === 'paying'}
                          className="cta-primary w-full"
                          style={{ opacity: payStep === 'approving' || payStep === 'paying' ? 0.6 : 1 }}
                        >
                          {payStep === 'approving'
                            ? 'Approving WMON...'
                            : payStep === 'paying'
                            ? 'Processing payment...'
                            : 'Pay with WMON'}
                        </button>

                        <p className="text-center text-[10px] text-zinc-800">
                          Approve WMON + pay directly from your wallet on Monad.
                        </p>
                      </>
                    ) : (
                      <div className="text-zinc-600 text-sm text-center">Loading wallet...</div>
                    )}
                  </div>
                )}
              </div>
            </Reveal>
          ) : (
            <Reveal delay={100}>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError('');
                try {
                  const res = await fetch('/api/turbo/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                  });
                  const data = await res.json();
                  if (!res.ok || !data.success) {
                    setError(data.error || 'Something went wrong. Please try again.');
                  } else {
                    setSubmitted(true);
                  }
                } catch {
                  setError('Network error. Please check your connection and try again.');
                } finally {
                  setLoading(false);
                }
              }} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] tracking-[0.12em] uppercase text-zinc-600 mb-2 syne font-semibold">Name</label>
                    <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-[11px] tracking-[0.12em] uppercase text-zinc-600 mb-2 syne font-semibold">Email</label>
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] tracking-[0.12em] uppercase text-zinc-600 mb-2 syne font-semibold">Twitter / X</label>
                    <input type="text" value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="@handle" />
                  </div>
                  <div>
                    <label className="block text-[11px] tracking-[0.12em] uppercase text-zinc-600 mb-2 syne font-semibold">Bybit UID</label>
                    <input type="text" required value={form.bybit} onChange={(e) => setForm({ ...form, bybit: e.target.value })} placeholder="Your Bybit UID" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] tracking-[0.12em] uppercase text-zinc-600 mb-2 syne font-semibold">Why TURBO?</label>
                  <textarea required rows={3} value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })}
                    placeholder="What are you building and why is TURBO the right fit..." style={{ resize: 'none' }} />
                </div>

                {/* Tier selection */}
                <div>
                  <label className="block text-[11px] tracking-[0.12em] uppercase text-zinc-600 mb-3 syne font-semibold">Select your tier</label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'explorer', label: 'Explorer', price: '$50', color: '#06b6d4' },
                      { value: 'builder', label: 'Builder', price: '$200', color: '#8b5cf6' },
                      { value: 'founder', label: 'Founder', price: '$500', color: '#f59e0b' },
                    ] as const).map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm({ ...form, tier: t.value })}
                        className="p-3 rounded-xl border text-center transition-all duration-200"
                        style={{
                          borderColor: form.tier === t.value ? t.color : 'rgba(63,63,70,0.3)',
                          background: form.tier === t.value ? `${t.color}08` : 'transparent',
                        }}
                      >
                        <div className="syne text-xs font-bold text-white">{t.label}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: form.tier === t.value ? t.color : '#71717a' }}>
                          {t.price} <span className="text-zinc-700">MXN/mo</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="text-red-400 text-sm text-center p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="cta-primary w-full mt-2" style={{ opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>

                <p className="text-center text-[11px] text-zinc-800">Rolling admissions. Cohort 1 starts soon.</p>
              </form>
            </Reveal>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-zinc-900/50">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="syne text-sm font-bold gt">TURBO</span>
            <span className="text-zinc-800 text-xs">by EmpowerTours</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-zinc-800">
            <span>Powered by Monad</span>
            <span className="w-px h-2.5 bg-zinc-900" />
            <span>&copy; 2026 EmpowerTours</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

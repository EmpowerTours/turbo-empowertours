'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { type Address } from 'viem';
import { CURRICULUM, MILESTONES, PHASE_COLORS } from '@/lib/homework/curriculum';
import { WEEKLY_REWARD, MILESTONE_BONUSES, getWeekReward } from '@/lib/homework/rewards';
import './homework.css';

/* ── Scroll reveal ── */

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

/* ── Types ── */

interface ProgressData {
  github: { username: string; avatarUrl: string; linkedAt: string } | null;
  completedWeeks: number[];
  totalWeeks: number;
  progress: Record<string, { completedAt: string; commitSha: string; verified: boolean }>;
  rewards: Record<string, { amount: number; txHash: string; distributedAt: string }>;
  totalEarned: number;
  totalDistributed: number;
  pendingReward: number;
}

/* ── Page ── */

export default function HomeworkPage() {
  const { login, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address as Address | undefined;

  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePhase, setActivePhase] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/homework/progress?wallet=${walletAddress}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load progress');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) fetchProgress();
  }, [walletAddress, fetchProgress]);

  useEffect(() => {
    document.body.style.backgroundColor = '#060608';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  const completedSet = new Set(data?.completedWeeks || []);
  const completedCount = completedSet.size;
  const progressPct = (completedCount / 52) * 100;

  // Group curriculum by phase
  const phases = CURRICULUM.reduce<Record<string, typeof CURRICULUM>>((acc, entry) => {
    if (!acc[entry.phase]) acc[entry.phase] = [];
    acc[entry.phase].push(entry);
    return acc;
  }, {});

  // GitHub OAuth link URL
  const githubLinkUrl = walletAddress
    ? `/api/github/callback?redirect=true` // OAuth is initiated client-side
    : '#';

  const buildGithubOAuthUrl = () => {
    if (!walletAddress) return '#';
    const clientId = 'Iv23liqRktzXrtHxJHwT';
    const redirectUri = `${window.location.origin}/api/github/callback`;
    // State is wallet:hmac, but we need server-side signing. Use a simpler approach:
    // redirect to a server endpoint that generates the OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user',
      state: walletAddress, // Will be verified server-side
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  };

  return (
    <div className="turbo-page">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#060608]/80 backdrop-blur-md border-b border-zinc-900/50">
        <a href="/" className="syne text-sm font-bold gt">TURBO</a>
        <div className="flex items-center gap-4">
          <span className="syne text-[11px] font-semibold tracking-[0.1em] uppercase text-cyan-400">
            Homework
          </span>
          <a href="/governance" className="syne text-[11px] font-semibold tracking-[0.1em] uppercase text-zinc-500 hover:text-cyan-400 transition-colors">
            Governance
          </a>
          <a href="/status" className="syne text-[11px] font-semibold tracking-[0.1em] uppercase text-zinc-500 hover:text-cyan-400 transition-colors">
            Pay here
          </a>
        </div>
      </nav>

      <div className="min-h-screen px-6 pt-24 pb-28 max-w-5xl mx-auto relative">
        <div className="orb" style={{ width: 500, height: 500, background: '#06b6d4', opacity: 0.06, top: '-10%', left: '20%', position: 'absolute' }} />

        <div className="relative z-10">
          {/* Header */}
          <Reveal>
            <div className="mb-10">
              <span className="syne inline-block text-[11px] font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: '#06b6d4' }}>
                Weekly Assignments
              </span>
              <h1 className="syne text-3xl md:text-4xl font-bold text-white mb-2">
                <span className="gt">Homework</span> Dashboard
              </h1>
              <p className="text-zinc-500 text-[15px]">Complete weekly assignments, earn TOURS tokens, and unlock milestone badges.</p>
            </div>
          </Reveal>

          {/* Auth gate */}
          {ready && !authenticated ? (
            <Reveal delay={100}>
              <div className="text-center p-12 rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                <div className="syne text-lg font-bold text-white mb-3">Connect to get started</div>
                <p className="text-zinc-500 text-sm mb-6">Connect your wallet to view your homework progress.</p>
                <button onClick={login} className="cta-primary">Connect Wallet</button>
              </div>
            </Reveal>
          ) : loading ? (
            <div className="text-zinc-600 text-center py-20">Loading progress...</div>
          ) : (
            <>
              {/* GitHub Link Card */}
              <Reveal delay={100}>
                <div className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/20 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="syne text-sm font-bold text-white mb-1">GitHub Connection</div>
                      {data?.github ? (
                        <div className="flex items-center gap-3 mt-2">
                          <img
                            src={data.github.avatarUrl}
                            alt={data.github.username}
                            className="w-8 h-8 rounded-full border border-zinc-700/50"
                          />
                          <div>
                            <span className="text-zinc-300 text-sm font-medium">{data.github.username}</span>
                            <span className="text-zinc-700 text-[11px] ml-2">Linked</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-zinc-600 text-[12px]">Link your GitHub to auto-verify homework submissions.</p>
                      )}
                    </div>
                    {!data?.github && (
                      <a
                        href={buildGithubOAuthUrl()}
                        className="inline-flex items-center gap-2 syne text-[11px] font-bold tracking-[0.08em] uppercase py-2.5 px-5 rounded-lg bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 transition-all border border-zinc-700/50"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                        </svg>
                        Link GitHub
                      </a>
                    )}
                  </div>
                </div>
              </Reveal>

              {/* Progress Overview */}
              <Reveal delay={150}>
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                    <div className="text-[10px] tracking-[0.15em] uppercase text-zinc-600 mb-1">Completed</div>
                    <div className="syne text-2xl font-bold gt">{completedCount}<span className="text-zinc-600 text-sm font-normal"> / 52</span></div>
                  </div>
                  <div className="p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                    <div className="text-[10px] tracking-[0.15em] uppercase text-zinc-600 mb-1">TOURS Earned</div>
                    <div className="syne text-2xl font-bold text-cyan-400">{data?.totalEarned || 0}</div>
                  </div>
                  <div className="p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                    <div className="text-[10px] tracking-[0.15em] uppercase text-zinc-600 mb-1">Distributed</div>
                    <div className="syne text-2xl font-bold text-green-400">{data?.totalDistributed || 0}</div>
                  </div>
                  <div className="p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                    <div className="text-[10px] tracking-[0.15em] uppercase text-zinc-600 mb-1">Pending</div>
                    <div className="syne text-2xl font-bold text-amber-400">{data?.pendingReward || 0}</div>
                  </div>
                </div>
              </Reveal>

              {/* Progress Bar */}
              <Reveal delay={200}>
                <div className="mb-10">
                  <div className="flex justify-between text-[11px] text-zinc-600 mb-2">
                    <span className="syne font-semibold">Overall Progress</span>
                    <span>{progressPct.toFixed(0)}%</span>
                  </div>
                  <div className="hw-progress-bar">
                    <div className="hw-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </Reveal>

              {/* Milestone Badges */}
              <Reveal delay={250}>
                <div className="mb-10">
                  <span className="syne inline-block text-[11px] font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: '#8b5cf6' }}>
                    Milestone Badges
                  </span>
                  <div className="hw-badge-grid">
                    {MILESTONES.map((milestone) => {
                      const allCompleted = Array.from({ length: milestone }, (_, i) => i + 1).every(w => completedSet.has(w));
                      const phaseNames: Record<number, string> = { 8: 'Foundations', 20: 'Web3 Builder', 36: 'Full Stack', 52: 'Graduate' };
                      const phaseColors: Record<number, string> = { 8: PHASE_COLORS.foundations, 20: PHASE_COLORS.web3, 36: PHASE_COLORS.fullstack, 52: PHASE_COLORS.business };
                      return (
                        <div key={milestone} className={`hw-badge-card ${allCompleted ? 'earned' : ''}`}>
                          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center border"
                            style={{
                              borderColor: allCompleted ? `${phaseColors[milestone]}60` : '#27272a',
                              background: allCompleted ? `${phaseColors[milestone]}15` : '#0a0a0f',
                            }}>
                            {allCompleted ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={phaseColors[milestone]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
                              </svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                              </svg>
                            )}
                          </div>
                          <div className="syne text-xs font-bold" style={{ color: allCompleted ? phaseColors[milestone] : '#52525b' }}>
                            {phaseNames[milestone]}
                          </div>
                          <div className="text-[10px] text-zinc-700 mt-1">Week {milestone}</div>
                          <div className="text-[10px] mt-2" style={{ color: allCompleted ? '#22c55e' : '#3f3f46' }}>
                            +{MILESTONE_BONUSES[milestone]} TOURS bonus
                          </div>
                          {allCompleted && walletAddress && (
                            <a
                              href={`/api/homework/badge/${milestone}?wallet=${walletAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-2 text-[10px] syne font-semibold tracking-[0.08em] uppercase py-1 px-3 rounded-lg bg-green-500/10 text-green-400 hover:brightness-110 transition-all"
                            >
                              View Badge
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Reveal>

              {/* Curriculum Grid */}
              <Reveal delay={300}>
                <div className="mb-10">
                  <span className="syne inline-block text-[11px] font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: '#f59e0b' }}>
                    52-Week Curriculum
                  </span>

                  {Object.entries(phases).map(([phase, weeks]) => {
                    const color = weeks[0].phaseColor;
                    const phaseCompleted = weeks.filter(w => completedSet.has(w.week)).length;
                    return (
                      <div key={phase} className="mb-6">
                        <button
                          onClick={() => setActivePhase(activePhase === phase ? null : phase)}
                          className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/20 cursor-pointer hover:border-zinc-700/60 transition-colors"
                          style={{ borderLeftWidth: 3, borderLeftColor: color }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                            <span className="syne text-sm font-bold text-white">{phase}</span>
                            <span className="text-[11px] text-zinc-600">{phaseCompleted}/{weeks.length}</span>
                          </div>
                          <svg
                            width="14" height="14" viewBox="0 0 16 16" fill="none"
                            className="transition-transform duration-300"
                            style={{ transform: activePhase === phase ? 'rotate(180deg)' : 'none' }}
                          >
                            <path d="M4 6l4 4 4-4" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        <div
                          className="transition-all duration-300 overflow-hidden"
                          style={{
                            maxHeight: activePhase === phase ? `${weeks.length * 100}px` : '0',
                            opacity: activePhase === phase ? 1 : 0,
                          }}
                        >
                          <div className="hw-grid mt-3">
                            {weeks.map((entry) => {
                              const isCompleted = completedSet.has(entry.week);
                              const isMilestone = MILESTONES.includes(entry.week as typeof MILESTONES[number]);
                              const reward = getWeekReward(entry.week);
                              return (
                                <div
                                  key={entry.week}
                                  className={`hw-week-card ${isCompleted ? 'completed' : ''} ${isMilestone ? 'milestone' : ''}`}
                                  style={isMilestone ? { borderColor: `${color}40` } : undefined}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="syne text-[10px] tracking-[0.15em] uppercase text-zinc-600 font-semibold">
                                      Week {entry.week}
                                    </span>
                                    {isCompleted ? (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 syne font-semibold">
                                        Done
                                      </span>
                                    ) : (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/50 text-zinc-600 syne font-semibold">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                  <div className="syne text-[13px] font-bold text-white mb-1">{entry.title}</div>
                                  <p className="text-[11px] text-zinc-600 leading-relaxed mb-2">{entry.description}</p>
                                  <div className="flex items-center justify-between">
                                    <code className="text-[10px] text-zinc-700 font-mono">{entry.deliverable}</code>
                                    <span className="text-[10px] font-semibold" style={{ color }}>
                                      {reward} TOURS
                                    </span>
                                  </div>
                                  {isMilestone && (
                                    <div className="mt-2 pt-2 border-t border-zinc-800/40">
                                      <span className="text-[10px] syne font-semibold" style={{ color }}>
                                        Milestone — +{MILESTONE_BONUSES[entry.week]} bonus
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Reveal>

              {/* Reward Info */}
              <Reveal delay={350}>
                <div className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                  <div className="syne text-sm font-bold text-white mb-3">How Rewards Work</div>
                  <div className="space-y-2 text-[12px] text-zinc-500">
                    <div className="flex justify-between">
                      <span>Weekly completion</span>
                      <span className="text-zinc-400">{WEEKLY_REWARD} TOURS</span>
                    </div>
                    {Object.entries(MILESTONE_BONUSES).map(([week, bonus]) => (
                      <div key={week} className="flex justify-between">
                        <span>Week {week} milestone bonus</span>
                        <span className="text-zinc-400">+{bonus} TOURS</span>
                      </div>
                    ))}
                    <div className="border-t border-zinc-800/40 pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span className="text-zinc-400">Max total (52 weeks)</span>
                        <span className="gt syne font-bold">13,200 TOURS</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-900/50">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <a href="/" className="syne text-sm font-bold gt hover:opacity-80 transition-opacity">TURBO</a>
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

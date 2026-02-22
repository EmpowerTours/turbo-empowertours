'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { monad } from '@/lib/monad';
import {
  TURBO_COHORT_ADDRESS,
  TURBO_COHORT_ABI,
  TURBO_GOVERNANCE_ADDRESS,
  TURBO_GOVERNANCE_ABI,
  PROPOSAL_STATUS,
  PROPOSAL_STATUS_COLORS,
  PASSPORT_ADDRESS,
  PASSPORT_ABI,
} from '@/lib/contracts';
import './governance.css';

const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

/* ── Types ── */

interface ProposalData {
  id: number;
  cohortId: number;
  proposer: string;
  startTime: number;
  endTime: number;
  yesVotes: number;
  noVotes: number;
  status: number;
  founders: string[];
  amounts: bigint[];
  userHasVoted: boolean;
}

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

/* ── Helpers ── */

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function padHex(val: bigint | number, bytes = 32): string {
  return BigInt(val).toString(16).padStart(bytes * 2, '0');
}

function padAddr(addr: string): string {
  return addr.slice(2).toLowerCase().padStart(64, '0');
}

// Standard ABI encoding for functions with dynamic arrays
function encodeDynamicArrayCall(selector: string, cohortId: number, addresses: string[], amounts: bigint[]): string {
  // Head: cohortId (static) + offset to address[] + offset to uint256[]
  // Tail: address[] data, uint256[] data
  const cohortHex = padHex(cohortId);

  // 3 head slots: cohortId, offset1, offset2 -> each 32 bytes
  // offset to address[] = 3 * 32 = 96 = 0x60
  // offset to uint256[] = 96 + 32 + addresses.length * 32
  const addrArraySize = 32 + addresses.length * 32; // length + data
  const offset1 = padHex(96); // 0x60
  const offset2 = padHex(96 + addrArraySize);

  // address[] encoding: length + each address padded to 32 bytes
  const addrLen = padHex(addresses.length);
  const addrData = addresses.map(a => padAddr(a)).join('');

  // uint256[] encoding: length + each amount padded to 32 bytes
  const amtLen = padHex(amounts.length);
  const amtData = amounts.map(a => padHex(a)).join('');

  return selector + cohortHex + offset1 + offset2 + addrLen + addrData + amtLen + amtData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function encodeGovCall(fn: string, args: any[]): string {
  if (fn === 'vote') {
    const selector = '0xc9d27afe';
    const proposalId = padHex(args[0] as number);
    const support = padHex(args[1] ? 1 : 0);
    return selector + proposalId + support;
  }
  if (fn === 'createProposal') {
    return encodeDynamicArrayCall('0x3f12c688', args[0] as number, args[1] as string[], args[2] as bigint[]);
  }
  if (fn === 'finalizeProposal') {
    const selector = '0x5652077c';
    return selector + padHex(args[0] as number);
  }
  if (fn === 'executeProposal') {
    const selector = '0x0d61b519';
    return selector + padHex(args[0] as number);
  }
  if (fn === 'cancelProposal') {
    const selector = '0xe0a8f6f5';
    return selector + padHex(args[0] as number);
  }
  if (fn === 'vetoProposal') {
    const selector = '0x6f65108c';
    return selector + padHex(args[0] as number);
  }
  if (fn === 'selectFoundersDirect') {
    return encodeDynamicArrayCall('0x3b53674d', args[0] as number, args[1] as string[], args[2] as bigint[]);
  }
  if (fn === 'addCouncilMember') {
    const selector = '0x289f5375';
    return selector + padAddr(args[0] as string);
  }
  if (fn === 'removeCouncilMember') {
    const selector = '0x5720439d';
    return selector + padAddr(args[0] as string);
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

export default function GovernancePage() {
  const { login, authenticated, ready, user } = usePrivy();
  const { wallets } = useWallets();

  const connectedWallet = wallets[0];
  const walletAddress = connectedWallet?.address as Address | undefined;

  // Core state
  const [role, setRole] = useState<'admin' | 'council' | 'observer'>('observer');
  const [hasPassport, setHasPassport] = useState<boolean | null>(null);
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [councilMembers, setCouncilMembers] = useState<string[]>([]);
  const [quorum, setQuorum] = useState(0);
  const [proposalCount, setProposalCount] = useState(0);
  const [currentCohortId, setCurrentCohortId] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form state for create proposal
  const [formCohortId, setFormCohortId] = useState('');
  const [formFounders, setFormFounders] = useState([{ address: '', amount: '' }]);

  // Direct selection form
  const [directCohortId, setDirectCohortId] = useState('');
  const [directFounders, setDirectFounders] = useState([{ address: '', amount: '' }]);

  // Council management
  const [newCouncilAddr, setNewCouncilAddr] = useState('');

  // TX state
  const [txStep, setTxStep] = useState<'idle' | 'sending' | 'confirming' | 'success' | 'error'>('idle');
  const [txError, setTxError] = useState('');
  const [txHash, setTxHash] = useState('');

  // Copied state
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  // Countdown ticker
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch all governance data
  const fetchData = useCallback(async () => {
    try {
      const [ownerResult, councilResult, quorumResult, countResult, cohortResult] = await Promise.all([
        publicClient.readContract({
          address: TURBO_GOVERNANCE_ADDRESS,
          abi: TURBO_GOVERNANCE_ABI,
          functionName: 'owner',
        }),
        publicClient.readContract({
          address: TURBO_GOVERNANCE_ADDRESS,
          abi: TURBO_GOVERNANCE_ABI,
          functionName: 'getCouncilMembers',
        }),
        publicClient.readContract({
          address: TURBO_GOVERNANCE_ADDRESS,
          abi: TURBO_GOVERNANCE_ABI,
          functionName: 'quorumRequired',
        }),
        publicClient.readContract({
          address: TURBO_GOVERNANCE_ADDRESS,
          abi: TURBO_GOVERNANCE_ABI,
          functionName: 'proposalCount',
        }),
        publicClient.readContract({
          address: TURBO_COHORT_ADDRESS,
          abi: TURBO_COHORT_ABI,
          functionName: 'currentCohortId',
        }),
      ]);

      const owner = ownerResult as string;
      const council = councilResult as string[];
      const q = Number(quorumResult);
      const count = Number(countResult);
      const cohort = Number(cohortResult);

      setCouncilMembers(council);
      setQuorum(q);
      setProposalCount(count);
      setCurrentCohortId(cohort);

      // Determine role + passport check
      if (walletAddress) {
        const isOwner = walletAddress.toLowerCase() === owner.toLowerCase();
        const isCouncil = council.some(m => m.toLowerCase() === walletAddress.toLowerCase());
        setRole(isOwner ? 'admin' : isCouncil ? 'council' : 'observer');

        // Check EmpowerTours Passport NFT
        try {
          const passportBalance = await publicClient.readContract({
            address: PASSPORT_ADDRESS,
            abi: PASSPORT_ABI,
            functionName: 'balanceOf',
            args: [walletAddress],
          });
          setHasPassport(Number(passportBalance) > 0);
          if (Number(passportBalance) === 0 && user?.farcaster?.ownerAddress) {
            const fcAddr = user.farcaster.ownerAddress as Address;
            if (fcAddr.toLowerCase() !== walletAddress.toLowerCase()) {
              try {
                const fcBal = await publicClient.readContract({
                  address: PASSPORT_ADDRESS,
                  abi: PASSPORT_ABI,
                  functionName: 'balanceOf',
                  args: [fcAddr],
                });
                if (Number(fcBal) > 0) setHasPassport(true);
              } catch {}
            }
          }
        } catch {
          setHasPassport(false);
        }
      } else {
        setRole('observer');
        setHasPassport(null);
      }

      // Fetch all proposals
      const proposalPromises: Promise<ProposalData>[] = [];
      for (let i = 1; i <= count; i++) {
        proposalPromises.push(
          (async () => {
            const [proposal, slate] = await Promise.all([
              publicClient.readContract({
                address: TURBO_GOVERNANCE_ADDRESS,
                abi: TURBO_GOVERNANCE_ABI,
                functionName: 'getProposal',
                args: [BigInt(i)],
              }),
              publicClient.readContract({
                address: TURBO_GOVERNANCE_ADDRESS,
                abi: TURBO_GOVERNANCE_ABI,
                functionName: 'getProposalSlate',
                args: [BigInt(i)],
              }),
            ]);

            const p = proposal as [bigint, string, bigint, bigint, bigint, bigint, number];
            const s = slate as [string[], bigint[]];

            let userVoted = false;
            if (walletAddress) {
              try {
                userVoted = await publicClient.readContract({
                  address: TURBO_GOVERNANCE_ADDRESS,
                  abi: TURBO_GOVERNANCE_ABI,
                  functionName: 'hasVoted',
                  args: [BigInt(i), walletAddress],
                }) as boolean;
              } catch {
                // ignore
              }
            }

            return {
              id: i,
              cohortId: Number(p[0]),
              proposer: p[1],
              startTime: Number(p[2]),
              endTime: Number(p[3]),
              yesVotes: Number(p[4]),
              noVotes: Number(p[5]),
              status: p[6],
              founders: s[0],
              amounts: s[1],
              userHasVoted: userVoted,
            };
          })()
        );
      }

      const allProposals = await Promise.all(proposalPromises);
      setProposals(allProposals.reverse()); // newest first
    } catch (err) {
      console.error('Failed to fetch governance data:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    document.body.style.backgroundColor = '#060608';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  // Send a governance transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendTx = async (fn: string, args: any[]) => {
    if (!walletAddress || !connectedWallet) return;
    setTxStep('sending');
    setTxError('');
    setTxHash('');

    try {
      const provider = await connectedWallet.getEthereumProvider();
      const data = encodeGovCall(fn, args);

      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: TURBO_GOVERNANCE_ADDRESS,
          data,
        }],
      });

      setTxHash(hash as string);
      setTxStep('confirming');
      await waitForTx(hash as string);
      setTxStep('success');

      // Refresh data after successful tx
      setTimeout(() => fetchData(), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setTxError(message.includes('user rejected') ? 'Transaction was rejected.' : message);
      setTxStep('error');
    }
  };

  const resetTx = () => {
    setTxStep('idle');
    setTxError('');
    setTxHash('');
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  // Countdown helper
  const formatCountdown = (endTime: number) => {
    const diff = endTime - now;
    if (diff <= 0) return 'Voting ended';
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  // Filter proposals
  const activeProposals = proposals.filter(p => p.status === 1); // Active
  const historyProposals = proposals.filter(p => p.status !== 1);

  const roleBadgeColor = role === 'admin' ? '#f59e0b' : role === 'council' ? '#8b5cf6' : '#52525b';

  return (
    <div className="gov-page">
      <div className="orb" style={{ width: 500, height: 500, background: '#06b6d4', opacity: 0.06, top: '-10%', left: '20%' }} />
      <div className="orb" style={{ width: 400, height: 400, background: '#8b5cf6', opacity: 0.04, bottom: '10%', right: '15%' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-28">
        {/* Top nav */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#060608]/80 backdrop-blur-md border-b border-zinc-900/50">
          <a href="/" className="syne text-sm font-bold gt">TURBO</a>
          <div className="flex items-center gap-4">
            <a href="/status" className="syne text-[11px] font-semibold tracking-[0.1em] uppercase text-zinc-500 hover:text-cyan-400 transition-colors">
              Status
            </a>
            <span className="syne text-[11px] font-semibold tracking-[0.1em] uppercase text-cyan-400">
              Governance
            </span>
          </div>
        </nav>

        {/* Header */}
        <Reveal>
          <div className="gov-header">
            <div className="gov-header-left">
              <h1 className="syne text-3xl md:text-4xl font-bold text-white">
                <span className="gt">Governance</span>
              </h1>
              {authenticated && (
                <span
                  className="gov-role-badge"
                  style={{ color: roleBadgeColor, borderColor: `${roleBadgeColor}40`, background: `${roleBadgeColor}10` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: roleBadgeColor }} />
                  {role}
                </span>
              )}
            </div>

            <div className="gov-stats">
              <div className="gov-stat">
                <div className="gov-stat-value">{councilMembers.length}</div>
                <div className="gov-stat-label">Council</div>
              </div>
              <div className="gov-stat">
                <div className="gov-stat-value">{quorum}</div>
                <div className="gov-stat-label">Quorum</div>
              </div>
              <div className="gov-stat">
                <div className="gov-stat-value">{proposalCount}</div>
                <div className="gov-stat-label">Proposals</div>
              </div>
              <div className="gov-stat">
                <div className="gov-stat-value">{currentCohortId}</div>
                <div className="gov-stat-label">Cohort</div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Connect wallet prompt */}
        {ready && !authenticated && (
          <Reveal delay={100}>
            <div className="gov-form-card text-center">
              <p className="text-zinc-500 text-sm mb-4">Connect your wallet to participate in governance.</p>
              <button onClick={login} className="gov-btn gov-btn-primary">Connect Wallet</button>
            </div>
          </Reveal>
        )}

        {/* Passport gate — must hold EmpowerTours Passport NFT */}
        {authenticated && hasPassport === false && (
          <Reveal delay={100}>
            <div className="gov-form-card" style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f59e0b12', border: '1px solid #f59e0b25' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4M12 17h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                </div>
                <div>
                  <h3 className="syne text-sm font-bold text-white mb-1">EmpowerTours Passport Required</h3>
                  <p className="text-zinc-500 text-[13px] leading-relaxed mb-3">
                    To participate in TURBO governance, you must hold an <span className="text-amber-400 font-medium">EmpowerTours Passport NFT</span>. LATAM passports preferred, but all countries welcome.
                  </p>
                  <a
                    href="/passport"
                    className="inline-flex items-center gap-2 syne text-[11px] font-bold tracking-[0.08em] uppercase py-2 px-4 rounded-lg bg-amber-500/10 text-amber-400 hover:brightness-110 transition-all"
                  >
                    <span>Mint Passport</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* TX Status Banner */}
        {txStep !== 'idle' && (
          <div className={`gov-tx-status ${txStep === 'success' ? 'success' : txStep === 'error' ? 'error' : 'pending'}`} style={{ marginBottom: 16 }}>
            <div className="flex items-center justify-between">
              <span>
                {txStep === 'sending' && 'Confirm transaction in your wallet...'}
                {txStep === 'confirming' && 'Transaction submitted. Waiting for confirmation...'}
                {txStep === 'success' && 'Transaction confirmed!'}
                {txStep === 'error' && (txError || 'Transaction failed.')}
              </span>
              <div className="flex items-center gap-3">
                {txHash && (
                  <a
                    href={`https://monadscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] underline underline-offset-2 opacity-80 hover:opacity-100"
                  >
                    View tx
                  </a>
                )}
                {(txStep === 'success' || txStep === 'error') && (
                  <button onClick={resetTx} className="text-[11px] opacity-60 hover:opacity-100 bg-transparent border-none cursor-pointer" style={{ color: 'inherit' }}>
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="gov-empty">
            <div className="syne text-sm text-zinc-600">Loading governance data...</div>
          </div>
        ) : (
          <>
            {/* ═══ ACTIVE PROPOSALS ═══ */}
            <Reveal delay={100}>
              <div style={{ marginBottom: 32 }}>
                <h2 className="syne text-lg font-bold text-white mb-4">Active Proposals</h2>
                {activeProposals.length === 0 ? (
                  <div className="gov-empty">No active proposals</div>
                ) : (
                  activeProposals.map(p => (
                    <ProposalCard
                      key={p.id}
                      proposal={p}
                      role={role}
                      walletAddress={walletAddress}
                      now={now}
                      formatCountdown={formatCountdown}
                      onVote={(id, support) => sendTx('vote', [id, support])}
                      onFinalize={(id) => sendTx('finalizeProposal', [id])}
                      onCancel={(id) => sendTx('cancelProposal', [id])}
                      onVeto={(id) => sendTx('vetoProposal', [id])}
                      onExecute={(id) => sendTx('executeProposal', [id])}
                      txStep={txStep}
                      copyAddr={copyAddr}
                      copiedAddr={copiedAddr}
                    />
                  ))
                )}
              </div>
            </Reveal>

            {/* ═══ CREATE PROPOSAL (council, cohort >= 2) ═══ */}
            {(role === 'council' || role === 'admin') && currentCohortId >= 2 && (
              <Reveal delay={200}>
                <div className="gov-form-card" style={{ marginBottom: 32 }}>
                  <h2 className="syne text-lg font-bold text-white mb-1">Create Proposal</h2>
                  <p className="text-zinc-600 text-[12px] mb-5">Propose a Graduating Founder slate for council vote.</p>

                  <div style={{ marginBottom: 12 }}>
                    <label className="gov-form-label">Cohort ID</label>
                    <input
                      className="gov-form-input"
                      type="number"
                      min="2"
                      placeholder="e.g. 2"
                      value={formCohortId}
                      onChange={e => setFormCohortId(e.target.value)}
                      style={{ maxWidth: 160 }}
                    />
                  </div>

                  <label className="gov-form-label">Founder Slate</label>
                  {formFounders.map((f, i) => (
                    <div key={i} className="gov-form-row">
                      <input
                        className="gov-form-input"
                        placeholder="0x... founder address"
                        value={f.address}
                        onChange={e => {
                          const updated = [...formFounders];
                          updated[i] = { ...updated[i], address: e.target.value };
                          setFormFounders(updated);
                        }}
                      />
                      <input
                        className="gov-form-input"
                        placeholder="WMON amount"
                        value={f.amount}
                        onChange={e => {
                          const updated = [...formFounders];
                          updated[i] = { ...updated[i], amount: e.target.value };
                          setFormFounders(updated);
                        }}
                      />
                      <button
                        type="button"
                        className={`gov-form-row-btn ${formFounders.length > 1 ? 'remove' : ''}`}
                        onClick={() => {
                          if (formFounders.length > 1) {
                            setFormFounders(formFounders.filter((_, j) => j !== i));
                          }
                        }}
                        disabled={formFounders.length <= 1}
                      >
                        -
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="gov-form-row-btn"
                    style={{ marginTop: 4, marginBottom: 16 }}
                    onClick={() => setFormFounders([...formFounders, { address: '', amount: '' }])}
                  >
                    +
                  </button>

                  <button
                    className="gov-btn gov-btn-primary"
                    disabled={txStep === 'sending' || txStep === 'confirming'}
                    onClick={() => {
                      const cohort = parseInt(formCohortId);
                      const addrs = formFounders.map(f => f.address.trim());
                      const amts = formFounders.map(f => {
                        try { return BigInt(Math.floor(parseFloat(f.amount) * 1e18)); }
                        catch { return BigInt(0); }
                      });
                      if (!cohort || addrs.some(a => !a.startsWith('0x'))) return;
                      sendTx('createProposal', [cohort, addrs, amts]);
                    }}
                  >
                    Submit Proposal
                  </button>
                </div>
              </Reveal>
            )}

            {/* ═══ DIRECT SELECTION (admin only, cohort < 2) ═══ */}
            {role === 'admin' && (
              <Reveal delay={200}>
                <div className="gov-form-card" style={{ marginBottom: 32 }}>
                  <h2 className="syne text-lg font-bold text-white mb-1">Direct Selection</h2>
                  <p className="text-zinc-600 text-[12px] mb-5">Admin-only: Select founders directly for early cohorts (cohort &lt; 2).</p>

                  <div style={{ marginBottom: 12 }}>
                    <label className="gov-form-label">Cohort ID</label>
                    <input
                      className="gov-form-input"
                      type="number"
                      min="0"
                      placeholder="e.g. 1"
                      value={directCohortId}
                      onChange={e => setDirectCohortId(e.target.value)}
                      style={{ maxWidth: 160 }}
                    />
                  </div>

                  <label className="gov-form-label">Founder Slate</label>
                  {directFounders.map((f, i) => (
                    <div key={i} className="gov-form-row">
                      <input
                        className="gov-form-input"
                        placeholder="0x... founder address"
                        value={f.address}
                        onChange={e => {
                          const updated = [...directFounders];
                          updated[i] = { ...updated[i], address: e.target.value };
                          setDirectFounders(updated);
                        }}
                      />
                      <input
                        className="gov-form-input"
                        placeholder="WMON amount"
                        value={f.amount}
                        onChange={e => {
                          const updated = [...directFounders];
                          updated[i] = { ...updated[i], amount: e.target.value };
                          setDirectFounders(updated);
                        }}
                      />
                      <button
                        type="button"
                        className={`gov-form-row-btn ${directFounders.length > 1 ? 'remove' : ''}`}
                        onClick={() => {
                          if (directFounders.length > 1) {
                            setDirectFounders(directFounders.filter((_, j) => j !== i));
                          }
                        }}
                        disabled={directFounders.length <= 1}
                      >
                        -
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="gov-form-row-btn"
                    style={{ marginTop: 4, marginBottom: 16 }}
                    onClick={() => setDirectFounders([...directFounders, { address: '', amount: '' }])}
                  >
                    +
                  </button>

                  <button
                    className="gov-btn gov-btn-primary"
                    disabled={txStep === 'sending' || txStep === 'confirming'}
                    onClick={() => {
                      const cohort = parseInt(directCohortId);
                      const addrs = directFounders.map(f => f.address.trim());
                      const amts = directFounders.map(f => {
                        try { return BigInt(Math.floor(parseFloat(f.amount) * 1e18)); }
                        catch { return BigInt(0); }
                      });
                      if (isNaN(cohort) || addrs.some(a => !a.startsWith('0x'))) return;
                      sendTx('selectFoundersDirect', [cohort, addrs, amts]);
                    }}
                  >
                    Select Founders
                  </button>
                </div>
              </Reveal>
            )}

            {/* ═══ PROPOSAL HISTORY ═══ */}
            <Reveal delay={300}>
              <div style={{ marginBottom: 32 }}>
                <h2 className="syne text-lg font-bold text-white mb-4">Proposal History</h2>
                {historyProposals.length === 0 ? (
                  <div className="gov-empty">No past proposals</div>
                ) : (
                  historyProposals.map(p => (
                    <ProposalCard
                      key={p.id}
                      proposal={p}
                      role={role}
                      walletAddress={walletAddress}
                      now={now}
                      formatCountdown={formatCountdown}
                      onVote={(id, support) => sendTx('vote', [id, support])}
                      onFinalize={(id) => sendTx('finalizeProposal', [id])}
                      onCancel={(id) => sendTx('cancelProposal', [id])}
                      onVeto={(id) => sendTx('vetoProposal', [id])}
                      onExecute={(id) => sendTx('executeProposal', [id])}
                      txStep={txStep}
                      copyAddr={copyAddr}
                      copiedAddr={copiedAddr}
                    />
                  ))
                )}
              </div>
            </Reveal>

            {/* ═══ COUNCIL ROSTER ═══ */}
            <Reveal delay={400}>
              <div style={{ marginBottom: 32 }}>
                <h2 className="syne text-lg font-bold text-white mb-4">
                  Council Roster
                  <span className="text-zinc-600 text-sm font-normal ml-2">({councilMembers.length} members)</span>
                </h2>

                {councilMembers.length === 0 ? (
                  <div className="gov-empty">No council members yet</div>
                ) : (
                  <div className="gov-council-grid">
                    {councilMembers.map((addr, i) => (
                      <div key={i} className="gov-council-item">
                        <span className="gov-council-addr">{shortAddr(addr)}</span>
                        <button className="gov-council-copy" onClick={() => copyAddr(addr)}>
                          {copiedAddr === addr ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin: Add/Remove council member */}
                {role === 'admin' && (
                  <div style={{ marginTop: 16 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        className="gov-form-input"
                        placeholder="0x... address"
                        value={newCouncilAddr}
                        onChange={e => setNewCouncilAddr(e.target.value)}
                        style={{ maxWidth: 360 }}
                      />
                      <button
                        className="gov-btn gov-btn-yes"
                        disabled={txStep === 'sending' || txStep === 'confirming' || !newCouncilAddr.startsWith('0x')}
                        onClick={() => {
                          sendTx('addCouncilMember', [newCouncilAddr.trim()]);
                          setNewCouncilAddr('');
                        }}
                      >
                        Add
                      </button>
                      <button
                        className="gov-btn gov-btn-no"
                        disabled={txStep === 'sending' || txStep === 'confirming' || !newCouncilAddr.startsWith('0x')}
                        onClick={() => {
                          sendTx('removeCouncilMember', [newCouncilAddr.trim()]);
                          setNewCouncilAddr('');
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>

            {/* Contract link */}
            <Reveal delay={500}>
              <div className="text-center">
                <a
                  href={`https://monadscan.com/address/${TURBO_GOVERNANCE_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 syne text-[11px] font-bold tracking-[0.1em] uppercase py-3 px-6 rounded-lg bg-purple-500/10 text-purple-400 hover:brightness-110 transition-all"
                >
                  <span>TurboGovernance Contract</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </Reveal>
          </>
        )}
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

/* ── Proposal Card Component ── */

function ProposalCard({
  proposal: p,
  role,
  walletAddress,
  now,
  formatCountdown,
  onVote,
  onFinalize,
  onCancel,
  onVeto,
  onExecute,
  txStep,
  copyAddr,
  copiedAddr,
}: {
  proposal: ProposalData;
  role: string;
  walletAddress: Address | undefined;
  now: number;
  formatCountdown: (endTime: number) => string;
  onVote: (id: number, support: boolean) => void;
  onFinalize: (id: number) => void;
  onCancel: (id: number) => void;
  onVeto: (id: number) => void;
  onExecute: (id: number) => void;
  txStep: string;
  copyAddr: (addr: string) => void;
  copiedAddr: string | null;
}) {
  const statusColor = PROPOSAL_STATUS_COLORS[p.status] || '#71717a';
  const statusLabel = PROPOSAL_STATUS[p.status] || 'Unknown';
  const totalVotes = p.yesVotes + p.noVotes;
  const yesPct = totalVotes > 0 ? (p.yesVotes / totalVotes) * 100 : 0;
  const noPct = totalVotes > 0 ? (p.noVotes / totalVotes) * 100 : 0;
  const votingEnded = now >= p.endTime;
  const isProposer = walletAddress?.toLowerCase() === p.proposer.toLowerCase();
  const isBusy = txStep === 'sending' || txStep === 'confirming';

  return (
    <div className="gov-proposal-card">
      <div className="gov-proposal-header">
        <div className="flex items-center gap-3">
          <span className="syne text-sm font-bold text-white">Proposal #{p.id}</span>
          <span
            className="gov-status-badge"
            style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}10` }}
          >
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
          <span>Cohort {p.cohortId}</span>
          <span>by {shortAddr(p.proposer)}</span>
        </div>
      </div>

      {/* Vote tally */}
      <div className="gov-vote-bar-wrap">
        <span className="text-[11px] text-green-500 syne font-bold" style={{ minWidth: 24 }}>{p.yesVotes}</span>
        <div className="gov-vote-bar">
          <div className="gov-vote-bar-yes" style={{ width: `${yesPct}%` }} />
          <div className="gov-vote-bar-no" style={{ width: `${noPct}%` }} />
        </div>
        <span className="text-[11px] text-red-500 syne font-bold" style={{ minWidth: 24 }}>{p.noVotes}</span>
      </div>
      <div className="gov-vote-labels">
        <span>Yes {yesPct > 0 ? `(${yesPct.toFixed(0)}%)` : ''}</span>
        {p.status === 1 && (
          <span className="gov-countdown">{formatCountdown(p.endTime)}</span>
        )}
        <span>No {noPct > 0 ? `(${noPct.toFixed(0)}%)` : ''}</span>
      </div>

      {/* Slate */}
      {p.founders.length > 0 && (
        <table className="gov-slate-table">
          <thead>
            <tr>
              <th>Founder</th>
              <th>Amount (WMON)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {p.founders.map((addr, i) => (
              <tr key={i}>
                <td>{shortAddr(addr)}</td>
                <td>{formatUnits(p.amounts[i], 18)}</td>
                <td>
                  <button className="gov-council-copy" onClick={() => copyAddr(addr)}>
                    {copiedAddr === addr ? 'Copied!' : 'Copy'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Action buttons */}
      <div className="gov-actions">
        {/* Vote buttons (council, active, not voted) */}
        {p.status === 1 && !votingEnded && (role === 'council' || role === 'admin') && !p.userHasVoted && (
          <>
            <button className="gov-btn gov-btn-yes" onClick={() => onVote(p.id, true)} disabled={isBusy}>
              Vote Yes
            </button>
            <button className="gov-btn gov-btn-no" onClick={() => onVote(p.id, false)} disabled={isBusy}>
              Vote No
            </button>
          </>
        )}

        {/* Already voted indicator */}
        {p.status === 1 && p.userHasVoted && (
          <span className="text-[11px] text-zinc-600 syne font-semibold uppercase tracking-wider py-2">
            You voted
          </span>
        )}

        {/* Finalize (active, voting ended) */}
        {p.status === 1 && votingEnded && (
          <button className="gov-btn gov-btn-exec" onClick={() => onFinalize(p.id)} disabled={isBusy}>
            Finalize
          </button>
        )}

        {/* Execute (passed) */}
        {p.status === 2 && (
          <button className="gov-btn gov-btn-exec" onClick={() => onExecute(p.id)} disabled={isBusy}>
            Execute
          </button>
        )}

        {/* Cancel (proposer, active) */}
        {p.status === 1 && isProposer && (
          <button className="gov-btn gov-btn-cancel" onClick={() => onCancel(p.id)} disabled={isBusy}>
            Cancel
          </button>
        )}

        {/* Veto (admin, active or passed) */}
        {role === 'admin' && (p.status === 1 || p.status === 2) && (
          <button className="gov-btn gov-btn-veto" onClick={() => onVeto(p.id)} disabled={isBusy}>
            Veto
          </button>
        )}
      </div>
    </div>
  );
}

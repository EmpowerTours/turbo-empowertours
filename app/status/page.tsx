'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { monad } from '@/lib/monad';
import {
  WMON_ADDRESS,
  TURBO_COHORT_ADDRESS,
  WMON_ABI,
  TURBO_COHORT_ABI,
  TIERS,
  TIER_NAMES,
  PASSPORT_ADDRESS,
  PASSPORT_ABI,
} from '@/lib/contracts';

const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

/* ── Helpers ── */

function encodeFunctionCall(fn: string, args: (string | number)[]): string {
  if (fn === 'approve') {
    const selector = '0x095ea7b3';
    const addr = (args[0] as string).slice(2).padStart(64, '0');
    const amount = (args[1] as string).slice(2).padStart(64, '0');
    return selector + addr + amount;
  }
  if (fn === 'payMonthly') {
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

/* ── Types ── */

interface ApplicationData {
  name: string;
  tier: string;
  status: string;
  appliedAt: string;
}

/* ── Page ── */

export default function StatusPage() {
  const { login, authenticated, ready, user } = usePrivy();
  const { wallets } = useWallets();

  // Lookup state
  const [email, setEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [application, setApplication] = useState<ApplicationData | null>(null);

  // Payment state
  const [payStep, setPayStep] = useState<'idle' | 'approving' | 'paying' | 'success' | 'error'>('idle');
  const [payError, setPayError] = useState('');
  const [payResult, setPayResult] = useState<{ txHash: string; amount: string } | null>(null);
  const [wmonBalance, setWmonBalance] = useState<string | null>(null);
  const [tierPrice, setTierPrice] = useState<bigint | null>(null);
  const [hasPassport, setHasPassport] = useState<boolean | null>(null);

  const connectedWallet = wallets[0];
  const walletAddress = connectedWallet?.address as Address | undefined;

  // Allow tier change before first payment
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const activeTier = selectedTier || (application?.tier ?? 'builder');
  const tierNum = TIERS[activeTier] ?? 1;

  const [copiedWallet, setCopiedWallet] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Sync selectedTier when application loads
  useEffect(() => {
    if (application && !selectedTier) {
      setSelectedTier(application.tier);
    }
  }, [application, selectedTier]);

  // Fetch WMON balance and tier price when wallet connects
  const fetchBalanceAndPrice = useCallback(async () => {
    if (!walletAddress || application === null) return;
    setBalanceLoading(true);
    try {
      const [balance, price, passportBal] = await Promise.all([
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
          args: [tierNum],
        }),
        publicClient.readContract({
          address: PASSPORT_ADDRESS,
          abi: PASSPORT_ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
        }),
      ]);
      setWmonBalance(formatUnits(balance, 18));
      setTierPrice(price);
      setHasPassport(Number(passportBal) > 0);
      if (Number(passportBal) === 0 && user?.farcaster?.ownerAddress) {
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
    } catch (err) {
      console.error('Failed to fetch balance/price:', err);
      setPayError('Failed to load wallet data. Please try again.');
    } finally {
      setBalanceLoading(false);
    }
  }, [walletAddress, application, tierNum, activeTier, user]);

  useEffect(() => {
    fetchBalanceAndPrice();
  }, [fetchBalanceAndPrice]);

  useEffect(() => {
    document.body.style.backgroundColor = '#060608';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupLoading(true);
    setLookupError('');
    setApplication(null);
    setPayStep('idle');
    setPayError('');
    setPayResult(null);

    try {
      const res = await fetch(`/api/turbo/status?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLookupError(data.error || 'Application not found.');
      } else {
        setApplication(data.application);
      }
    } catch {
      setLookupError('Network error. Please check your connection and try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!walletAddress || !connectedWallet || !application) {
      setPayError('Wallet not connected. Please connect your wallet first.');
      return;
    }

    // Fetch tier price if not yet loaded
    let price = tierPrice;
    if (!price) {
      try {
        price = await publicClient.readContract({
          address: TURBO_COHORT_ADDRESS,
          abi: TURBO_COHORT_ABI,
          functionName: 'tierPrice',
          args: [tierNum],
        });
        setTierPrice(price);
      } catch {
        setPayError('Failed to fetch tier price. Please try again.');
        return;
      }
    }

    setPayStep('approving');
    setPayError('');

    try {
      const provider = await connectedWallet.getEthereumProvider();

      // Check current allowance
      const allowance = await publicClient.readContract({
        address: WMON_ADDRESS,
        abi: WMON_ABI,
        functionName: 'allowance',
        args: [walletAddress, TURBO_COHORT_ADDRESS],
      });

      // Approve if needed
      if (allowance < price) {
        const approveTx = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: WMON_ADDRESS,
            data: encodeFunctionCall('approve', [TURBO_COHORT_ADDRESS, '0x' + price.toString(16)]),
          }],
        });
        await waitForTx(approveTx as string);
      }

      setPayStep('paying');

      const payTx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: TURBO_COHORT_ADDRESS,
          data: encodeFunctionCall('payMonthly', [tierNum]),
        }],
      });
      await waitForTx(payTx as string);

      setPayResult({ txHash: payTx as string, amount: formatUnits(price, 18) });
      setPayStep('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setPayError(message.includes('user rejected') ? 'Transaction was rejected.' : message);
      setPayStep('error');
    }
  };

  const tierColor: Record<string, string> = {
    explorer: '#06b6d4',
    builder: '#8b5cf6',
    founder: '#f59e0b',
  };

  return (
    <div className="turbo-page">
      <div className="min-h-screen flex flex-col items-center justify-start px-6 pt-20 pb-28 relative">
        <div className="orb" style={{ width: 500, height: 500, background: '#06b6d4', opacity: 0.06, top: '-10%', left: '20%' }} />
        <div className="orb" style={{ width: 400, height: 400, background: '#8b5cf6', opacity: 0.04, bottom: '10%', right: '15%' }} />

        <div className="relative z-10 w-full max-w-lg mx-auto">
          {/* Header */}
          <Reveal>
            <div className="text-center mb-10">
              <a href="/" className="inline-block mb-6">
                <span className="syne text-sm font-bold gt hover:opacity-80 transition-opacity">TURBO</span>
              </a>
              <Label color="#06b6d4">Application Status</Label>
              <h1 className="syne text-3xl md:text-4xl font-bold text-white mb-3">
                Check your <span className="gt">status.</span>
              </h1>
              <p className="text-zinc-600 text-sm">Look up your application and make your payment.</p>
            </div>
          </Reveal>

          {/* Email lookup form */}
          {!application && (
            <Reveal delay={100}>
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label className="block text-[11px] tracking-[0.12em] uppercase text-zinc-600 mb-2 syne font-semibold">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </div>

                {lookupError && (
                  <div className="text-red-400 text-sm text-center p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    {lookupError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="cta-primary w-full"
                  style={{ opacity: lookupLoading ? 0.6 : 1 }}
                >
                  {lookupLoading ? 'Looking up...' : 'Find My Application'}
                </button>
              </form>
            </Reveal>
          )}

          {/* Application details */}
          {application && (
            <Reveal>
              <div className="space-y-5">
                {/* Application info card */}
                <div className="p-6 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.03]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="syne text-lg font-bold gt">Application Found</div>
                    <button
                      onClick={() => { setApplication(null); setPayStep('idle'); setPayError(''); setPayResult(null); }}
                      className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
                    >
                      Look up another
                    </button>
                  </div>

                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Name</span>
                      <span className="text-zinc-300">{application.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Status</span>
                      <span className="text-zinc-300 capitalize">{application.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Applied</span>
                      <span className="text-zinc-400">
                        {new Date(application.appliedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Tier selector — changeable before first payment */}
                  <div className="mt-4 pt-4 border-t border-zinc-800/40">
                    <div className="text-[11px] tracking-[0.12em] uppercase text-zinc-600 mb-3 syne font-semibold">
                      Select Tier
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'explorer', label: 'Explorer', price: '$50', color: '#06b6d4' },
                        { value: 'builder', label: 'Builder', price: '$200', color: '#8b5cf6' },
                        { value: 'founder', label: 'Founder', price: '$500', color: '#f59e0b' },
                      ] as const).map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setSelectedTier(t.value)}
                          className="p-2.5 rounded-xl border text-center transition-all duration-200"
                          style={{
                            borderColor: activeTier === t.value ? t.color : 'rgba(63,63,70,0.3)',
                            background: activeTier === t.value ? `${t.color}08` : 'transparent',
                          }}
                        >
                          <div className="syne text-xs font-bold text-white">{t.label}</div>
                          <div className="text-[10px] mt-0.5" style={{ color: activeTier === t.value ? t.color : '#71717a' }}>
                            {t.price} <span className="text-zinc-700">MXN/mo</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-zinc-700 mt-2">
                      You can change your tier before your first payment.
                    </div>
                  </div>
                </div>

                {/* Payment section */}
                <div className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                  <div className="syne text-sm font-bold text-white mb-1">Make Your Payment</div>
                  <p className="text-zinc-600 text-[12px] mb-5">
                    Pay your monthly {TIER_NAMES[tierNum] || activeTier} tier fee in WMON on Monad.
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
                          <div className="p-4 rounded-lg border border-zinc-800/40 bg-zinc-900/30">
                            {/* Full wallet address with copy */}
                            <div className="mb-3">
                              <div className="text-zinc-600 text-[11px] mb-1.5">Your Privy Wallet</div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(walletAddress);
                                  setCopiedWallet(true);
                                  setTimeout(() => setCopiedWallet(false), 2000);
                                }}
                                className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 hover:border-cyan-500/30 hover:bg-zinc-800/80 transition-all cursor-pointer"
                                title="Click to copy full address"
                              >
                                <span className="font-mono text-[11px] text-cyan-400 break-all text-left leading-relaxed">
                                  {walletAddress}
                                </span>
                                <span className="flex-shrink-0 text-[10px] px-2 py-1 rounded border border-zinc-700/50 bg-zinc-900/50 text-zinc-400 syne font-semibold">
                                  {copiedWallet ? 'Copied!' : 'Copy'}
                                </span>
                              </button>
                              <div className="text-[10px] text-zinc-700 mt-1">Send WMON to this address on Monad to fund your wallet</div>
                            </div>
                            <div className="space-y-1 text-[12px]">
                              {wmonBalance !== null && (
                                <div className="flex justify-between">
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
                          </div>

                          {tierPrice !== null && wmonBalance !== null && parseFloat(wmonBalance) < parseFloat(formatUnits(tierPrice, 18)) && (
                            <div className="text-amber-400 text-sm text-center p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                              You need {formatUnits(tierPrice, 18)} WMON. Current balance: {parseFloat(wmonBalance).toFixed(4)} WMON
                            </div>
                          )}

                          {hasPassport === false && (
                            <div className="text-amber-400 text-sm text-center p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
                              <div className="syne font-bold text-[12px] mb-1">EmpowerTours Passport Required</div>
                              <p className="text-[11px] text-zinc-500 mb-2">You need an EmpowerTours Passport NFT to participate in TURBO. LATAM preferred, all countries welcome.</p>
                              <a href="/passport" className="text-[11px] text-amber-400 underline underline-offset-2">Mint Passport</a>
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
                            disabled={payStep === 'approving' || payStep === 'paying' || balanceLoading || hasPassport === false}
                            className="cta-primary w-full"
                            style={{ opacity: payStep === 'approving' || payStep === 'paying' || balanceLoading || hasPassport === false ? 0.6 : 1 }}
                          >
                            {balanceLoading
                              ? 'Loading wallet data...'
                              : hasPassport === false
                              ? 'Passport Required'
                              : payStep === 'approving'
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
              </div>
            </Reveal>
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

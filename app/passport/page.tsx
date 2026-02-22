'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, http, type Address } from 'viem';
import { monad } from '@/lib/monad';
import { PASSPORT_ADDRESS, PASSPORT_ABI } from '@/lib/contracts';
import { ALL_COUNTRIES, getCountryByCode, type Country } from '@/lib/passport/countries';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import './passport.css';

const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

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

/* ── Page ── */

export default function PassportPage() {
  const { login, authenticated, ready, user, linkFarcaster } = usePrivy();
  const { wallets } = useWallets();

  const connectedWallet = wallets[0];
  const walletAddress = connectedWallet?.address as Address | undefined;

  const [hasPassport, setHasPassport] = useState<boolean | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [mintStep, setMintStep] = useState<'idle' | 'minting' | 'success' | 'error'>('idle');
  const [mintError, setMintError] = useState('');
  const [mintResult, setMintResult] = useState<{ txHash: string; tokenId: number } | null>(null);
  const [manualSelect, setManualSelect] = useState(false);

  const { location: geoLocation, loading: geoLoading, error: geoError } = useGeolocation();

  const farcasterAddress = user?.farcaster?.ownerAddress as Address | undefined;

  // Set body bg
  useEffect(() => {
    document.body.style.backgroundColor = '#060608';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  // Collect all wallet addresses from Privy (connected, FC, linked accounts)
  const allAddresses = (() => {
    const seen = new Set<string>();
    const addrs: Address[] = [];
    const add = (a: string | undefined) => {
      if (!a) return;
      const low = a.toLowerCase();
      if (seen.has(low)) return;
      seen.add(low);
      addrs.push(a as Address);
    };
    add(walletAddress);
    add(farcasterAddress);
    if (user?.linkedAccounts) {
      for (const acct of user.linkedAccounts) {
        if ('address' in acct && typeof (acct as { address?: string }).address === 'string') {
          add((acct as { address: string }).address);
        }
      }
    }
    return addrs;
  })();

  // Check if user already has a passport on ANY linked address
  const checkPassport = useCallback(async () => {
    if (allAddresses.length === 0) {
      setHasPassport(null);
      return;
    }

    try {
      for (const addr of allAddresses) {
        const balance = await publicClient.readContract({
          address: PASSPORT_ADDRESS,
          abi: PASSPORT_ABI,
          functionName: 'balanceOf',
          args: [addr],
        });
        if (Number(balance) > 0) {
          setHasPassport(true);
          return;
        }
      }
      setHasPassport(false);
    } catch {
      setHasPassport(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAddresses.join(',')]);

  useEffect(() => {
    checkPassport();
  }, [checkPassport]);

  // Auto-select country from geolocation
  useEffect(() => {
    if (geoLocation && !manualSelect) {
      const country = getCountryByCode(geoLocation.countryCode);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, [geoLocation, manualSelect]);

  // Mint handler
  const handleMint = async () => {
    if (!walletAddress || !selectedCountry) return;
    setMintStep('minting');
    setMintError('');
    try {
      const res = await fetch('/api/passport/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: walletAddress, countryCode: selectedCountry.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mint failed');
      setMintResult({ txHash: data.txHash, tokenId: data.tokenId });
      setMintStep('success');
      setHasPassport(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Mint failed';
      setMintError(message);
      setMintStep('error');
    }
  };

  return (
    <div className="passport-page">
      {/* Decorative orbs */}
      <div className="orb" style={{ width: 500, height: 500, background: '#f59e0b', opacity: 0.06, top: '-10%', left: '20%' }} />
      <div className="orb" style={{ width: 400, height: 400, background: '#8b5cf6', opacity: 0.04, bottom: '10%', right: '15%' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-20 pb-28">
        {/* Top nav bar */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#060608]/80 backdrop-blur-md border-b border-zinc-900/50">
          <a href="/" className="syne text-sm font-bold gt">TURBO</a>
          <div className="flex items-center gap-4">
            <a href="/status" className="syne text-[11px] font-semibold tracking-[0.1em] uppercase text-zinc-500 hover:text-cyan-400 transition-colors">Status</a>
            <a href="/governance" className="syne text-[11px] font-semibold tracking-[0.1em] uppercase text-zinc-500 hover:text-cyan-400 transition-colors">Governance</a>
            <span className="syne text-[11px] font-semibold tracking-[0.1em] uppercase text-amber-400">Passport</span>
          </div>
        </nav>

        {/* Header */}
        <Reveal>
          <h1 className="syne text-3xl md:text-4xl font-bold text-white mb-2">
            <span className="gt">EmpowerTours Passport</span>
          </h1>
          <p className="text-zinc-500 text-sm mb-8">Mint your digital passport to participate in TURBO. LATAM preferred, all countries welcome.</p>
        </Reveal>

        {/* Connect wallet prompt */}
        {ready && !authenticated && (
          <Reveal delay={100}>
            <div className="passport-country-card text-center">
              <p className="text-zinc-500 text-sm mb-4">Connect your wallet to mint your passport.</p>
              <button onClick={login} className="passport-btn">Connect Wallet</button>
            </div>
          </Reveal>
        )}

        {/* Already has passport */}
        {authenticated && hasPassport === true && (
          <Reveal delay={100}>
            <div className="passport-success-card">
              <div className="text-center">
                <div className="text-5xl mb-4">&#127915;</div>
                <h2 className="syne text-xl font-bold text-white mb-2">You Have a Passport!</h2>
                <p className="text-zinc-500 text-sm mb-4">Your EmpowerTours Passport NFT is active. You&apos;re ready to participate in TURBO.</p>
                <a href={`https://monadscan.com/address/${PASSPORT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                  className="text-cyan-400 text-sm underline underline-offset-2">View on MonadScan</a>
              </div>
            </div>
          </Reveal>
        )}

        {/* Farcaster linking card */}
        {authenticated && user && !user.farcaster && (
          <Reveal delay={200}>
            <div className="passport-fc-card" style={{ marginTop: 16 }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#8b5cf620', border: '1px solid #8b5cf630' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                </div>
                <div className="flex-1">
                  <h3 className="syne text-sm font-bold text-white mb-1">Link Farcaster</h3>
                  <p className="text-zinc-500 text-[12px]">If you minted via the FC mini-app, link your Farcaster to connect your existing passport.</p>
                </div>
                <button onClick={() => linkFarcaster()} className="passport-btn" style={{ padding: '8px 16px', fontSize: 11 }}>Link</button>
              </div>
            </div>
          </Reveal>
        )}

        {/* Farcaster linked */}
        {authenticated && user?.farcaster && (
          <Reveal delay={200}>
            <div className="passport-fc-card" style={{ marginTop: 16 }}>
              <div className="flex items-center gap-4">
                {user.farcaster.pfp && <img src={user.farcaster.pfp} alt="" className="w-10 h-10 rounded-full" />}
                <div>
                  <h3 className="syne text-sm font-bold text-white">@{user.farcaster.username}</h3>
                  <p className="text-zinc-500 text-[11px]">Farcaster linked</p>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* Mint flow — only show if no passport */}
        {authenticated && hasPassport === false && (
          <>
            {/* Country detection */}
            <Reveal delay={100}>
              <div className="passport-country-card">
                {/* Auto-detected country */}
                {geoLoading && (
                  <div className="text-center">
                    <div className="passport-status pending">Detecting your location...</div>
                  </div>
                )}

                {!geoLoading && selectedCountry && !manualSelect && (
                  <div className="text-center">
                    <div className="passport-flag">{selectedCountry.flag}</div>
                    <h2 className="syne text-2xl font-bold text-white mt-4">{selectedCountry.name}</h2>
                    <p className="text-zinc-500 text-sm mt-1">{selectedCountry.region} &middot; {selectedCountry.continent}</p>
                    <button onClick={() => setManualSelect(true)} className="text-zinc-600 text-[11px] mt-3 underline underline-offset-2 hover:text-zinc-400 transition-colors" type="button">
                      Not your country? Select manually
                    </button>
                  </div>
                )}

                {((!geoLoading && !selectedCountry && geoError) || manualSelect) ? (
                  <div>
                    {geoError && !manualSelect && (
                      <p className="text-amber-400 text-sm text-center mb-4">{geoError}</p>
                    )}
                    <label className="passport-label">Select your country</label>
                    <select
                      className="passport-select"
                      value={selectedCountry?.code || ''}
                      onChange={(e) => {
                        const c = getCountryByCode(e.target.value);
                        if (c) setSelectedCountry(c);
                      }}
                    >
                      <option value="">Choose a country...</option>
                      {ALL_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                    {selectedCountry && manualSelect && (
                      <div className="text-center mt-6">
                        <div className="passport-flag">{selectedCountry.flag}</div>
                        <h2 className="syne text-xl font-bold text-white mt-2">{selectedCountry.name}</h2>
                        <p className="text-zinc-500 text-sm">{selectedCountry.region} &middot; {selectedCountry.continent}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </Reveal>

            {/* Mint button */}
            {selectedCountry && (
              <Reveal delay={200}>
                <div style={{ marginTop: 16 }}>
                  <button
                    onClick={handleMint}
                    disabled={mintStep === 'minting'}
                    className="passport-btn w-full"
                    style={{ opacity: mintStep === 'minting' ? 0.6 : 1 }}
                  >
                    {mintStep === 'minting' ? 'Minting your passport...' : `Mint ${selectedCountry.flag} ${selectedCountry.name} Passport`}
                  </button>

                  {mintStep === 'success' && mintResult && (
                    <div className="passport-status success" style={{ marginTop: 12 }}>
                      Passport minted! Token #{mintResult.tokenId} —{' '}
                      <a href={`https://monadscan.com/tx/${mintResult.txHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                        View tx
                      </a>
                    </div>
                  )}

                  {mintStep === 'error' && (
                    <div className="passport-status error" style={{ marginTop: 12 }}>
                      {mintError}
                      <button onClick={() => setMintStep('idle')} className="block text-[11px] underline mt-1">Try again</button>
                    </div>
                  )}
                </div>
              </Reveal>
            )}
          </>
        )}

        {/* Loading passport check */}
        {authenticated && hasPassport === null && (
          <Reveal delay={100}>
            <div className="passport-country-card text-center">
              <div className="passport-status pending">Checking passport status...</div>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}

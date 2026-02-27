'use client';

import VideoBackground from './VideoBackground';
import Logo from './Logo';

const VIDEO_SRC = '/hls/templates/digital-glass-morph/1080p/index.m3u8';

export default function IntroSlide() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <VideoBackground src={VIDEO_SRC} />

      <div className="relative z-10 flex flex-col w-full h-full" style={{ color: 'white' }}>
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: 'clamp(16px, 2.5%, 40px) clamp(24px, 5.2%, 80px)' }}
        >
          <Logo />
        </div>

        {/* Content */}
        <div
          className="flex-1 flex flex-col"
          style={{ padding: '0 clamp(24px, 5.2%, 80px)', paddingTop: 'clamp(8px, 1%, 20px)' }}
        >
          {/* Title */}
          <h2
            style={{
              fontSize: 'clamp(28px, 4.2vw, 64px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            12 Months to Launch<br />
            <span style={{ opacity: 0.7 }}>Your Web3 Startup</span>
          </h2>

          {/* Three columns */}
          <div
            className="flex"
            style={{
              marginTop: '3.5%',
              gap: '4%',
            }}
          >
            {/* Column 1 — Community Pool */}
            <div style={{ flex: '0 0 22%' }}>
              <p style={{ fontSize: 'clamp(13px, 1.05vw, 20px)', opacity: 0.9, lineHeight: 1.5 }}>
                TURBO is community-powered — 340 members contribute monthly to a shared pool
                that funds graduating founders. No venture capital required, just collective belief.
              </p>
              <div className="flex items-end" style={{ marginTop: '8%', gap: 'clamp(8px, 0.8vw, 16px)' }}>
                <span style={{ fontSize: 'clamp(28px, 4.2vw, 64px)', fontWeight: 700, lineHeight: 1 }}>
                  500K
                </span>
                <div style={{ paddingBottom: 'clamp(4px, 0.4vw, 10px)' }}>
                  <span style={{ fontSize: 'clamp(13px, 1.05vw, 20px)', opacity: 0.8, display: 'block' }}>
                    MXN Pool
                  </span>
                  <span style={{ fontSize: 'clamp(13px, 1.05vw, 20px)', opacity: 0.8, display: 'block' }}>
                    Target
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2 — Body text */}
            <div style={{ flex: '0 0 38%' }}>
              <p style={{ fontSize: 'clamp(13px, 1.05vw, 20px)', opacity: 0.9, lineHeight: 1.5 }}>
                TURBO bridges the gap between aspiring founders in Latin America and Monad&apos;s
                elite NITRO accelerator, which offers $500,000 USD per team. Our 52-week curriculum
                covers everything from Git fundamentals to Solidity smart contracts, full-stack
                dApp development, and startup business strategy.
              </p>
              <p style={{ fontSize: 'clamp(13px, 1.05vw, 20px)', opacity: 0.9, lineHeight: 1.5, marginTop: '3%' }}>
                Members earn TOURS tokens for completing homework, build their portfolio on-chain
                with soulbound NFT membership cards, and graduate ready to compete for NITRO&apos;s
                $500K funding. All payments and distributions are fully transparent on Monad.
              </p>
            </div>

            {/* Column 3 — Stat + Graph */}
            <div style={{ flex: '0 0 20%' }}>
              <span style={{ fontSize: 'clamp(28px, 4.2vw, 64px)', fontWeight: 700, lineHeight: 1, display: 'block' }}>
                $500K
              </span>
              <p style={{ fontSize: 'clamp(13px, 1.05vw, 20px)', opacity: 0.8, lineHeight: 1.4, marginTop: '6%' }}>
                USD per team available through Monad&apos;s NITRO program — TURBO graduates are primed to win.
              </p>

              {/* Mini line graph — growth trajectory */}
              <svg
                viewBox="0 0 200 80"
                style={{ width: '100%', marginTop: '10%' }}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D2FF55" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#D2FF55" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M10 65 C40 55, 60 50, 90 35 C120 20, 150 18, 190 10"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                />
                <path
                  d="M10 65 C40 55, 60 50, 90 35 C120 20, 150 18, 190 10 L190 80 L10 80 Z"
                  fill="url(#graphFill)"
                />
                <circle cx="10" cy="65" r="4" fill="#B750B2" stroke="white" strokeWidth="1.5" />
                <circle cx="190" cy="10" r="4" fill="#B750B2" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end"
          style={{
            padding: 'clamp(16px, 2%, 32px) clamp(24px, 5.2%, 80px)',
            fontSize: 'clamp(12px, 1.05vw, 20px)',
            opacity: 0.6,
          }}
        >
          Train. Build. Fund.
        </div>
      </div>
    </div>
  );
}

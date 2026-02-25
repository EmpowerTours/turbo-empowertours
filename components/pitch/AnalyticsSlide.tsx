'use client';

import VideoBackground from './VideoBackground';
import LiquidGlassCard from './LiquidGlassCard';
import Logo from './Logo';
import { Users, Rocket, Globe, Sparkles, Shield } from 'lucide-react';

const VIDEO_SRC = '/hls/templates/digital-wire-mesh/1080p/index.m3u8';

const cards = [
  {
    Icon: Users,
    title: 'Community-Powered',
    description: 'Members fund each other — 95% of payments go to the community pool that funds graduating founders.',
  },
  {
    Icon: Rocket,
    title: 'NITRO-Aligned',
    description: '52-week curriculum designed to prepare graduates for Monad NITRO\'s $500K per team.',
  },
  {
    Icon: Globe,
    title: 'LATAM-First',
    description: 'Built for Latin American founders. Taught in Spanish & English, bridging LATAM and global Web3.',
  },
  {
    Icon: Sparkles,
    title: 'AI-Powered Learning',
    description: 'Vibe coding approach with AI assistance — no prior coding experience required to start.',
  },
  {
    Icon: Shield,
    title: 'On-Chain Transparency',
    description: 'All payments, governance, and distributions auditable on Monad. Soulbound NFT membership cards.',
  },
];

export default function AnalyticsSlide() {
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

        {/* Title section */}
        <div className="text-center" style={{ padding: '0 clamp(24px, 5.2%, 80px)' }}>
          <p style={{ fontSize: 'clamp(14px, 1.3vw, 24px)', opacity: 0.9 }}>
            Five Pillars of
          </p>
          <h2
            style={{
              fontSize: 'clamp(28px, 4.2vw, 64px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              marginTop: 'clamp(4px, 0.5%, 10px)',
            }}
          >
            The TURBO Accelerator
          </h2>
        </div>

        {/* Card grid */}
        <div
          className="flex-1 flex flex-col"
          style={{
            padding: 'clamp(16px, 2%, 32px) clamp(24px, 5.2%, 80px)',
            gap: 'clamp(10px, 1.2vw, 25px)',
            minHeight: 0,
          }}
        >
          {/* Top row — 3 cards */}
          <div className="flex flex-1" style={{ gap: 'clamp(10px, 1.4vw, 27px)', minHeight: 0 }}>
            {cards.slice(0, 3).map((card) => (
              <GlassCard key={card.title} {...card} />
            ))}
          </div>

          {/* Bottom row — 2 cards */}
          <div className="flex flex-1" style={{ gap: 'clamp(10px, 1.3vw, 25px)', minHeight: 0 }}>
            {cards.slice(3, 5).map((card) => (
              <GlassCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassCard({
  Icon,
  title,
  description,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}) {
  return (
    <LiquidGlassCard className="flex-1 flex">
      <div
        className="flex flex-col justify-end flex-1"
        style={{ padding: 'clamp(20px, 2.5vw, 48px)' }}
      >
        <Icon
          style={{
            width: 'clamp(32px, 3vw, 48px)',
            height: 'clamp(32px, 3vw, 48px)',
            marginBottom: 'clamp(10px, 1.2vw, 20px)',
          }}
          stroke="white"
          strokeWidth={1.5}
          fill="none"
        />
        <h3
          style={{
            fontSize: 'clamp(18px, 2vw, 36px)',
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 'clamp(6px, 0.6vw, 12px)',
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 'clamp(12px, 1.05vw, 20px)', opacity: 0.8, lineHeight: 1.4 }}>
          {description}
        </p>
      </div>
    </LiquidGlassCard>
  );
}

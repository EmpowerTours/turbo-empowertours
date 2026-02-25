'use client';

import VideoBackground from './VideoBackground';
import Logo from './Logo';

const VIDEO_SRC = '/hls/templates/digital-data-stream/1080p/index.m3u8';

export default function CoverSlide() {
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

        {/* Center content */}
        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{
            paddingLeft: 'clamp(24px, 5.2%, 80px)',
            paddingRight: 'clamp(24px, 5.2%, 80px)',
            marginTop: '-3%',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 96px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              textAlign: 'center',
            }}
          >
            EmpowerTours TURBO
          </h1>
          <p
            style={{
              fontSize: 'clamp(20px, 2.8vw, 48px)',
              fontWeight: 400,
              opacity: 0.9,
              marginTop: '1.5%',
              textAlign: 'center',
            }}
          >
            Train. Build. Fund.
          </p>
          <p
            style={{
              fontSize: 'clamp(14px, 1.3vw, 24px)',
              fontWeight: 400,
              opacity: 0.75,
              marginTop: '2%',
              textAlign: 'center',
            }}
          >
            The LATAM Web3 Accelerator on Monad
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-center"
          style={{
            padding: 'clamp(16px, 2%, 32px) clamp(24px, 5.2%, 80px)',
            fontSize: 'clamp(12px, 1.05vw, 20px)',
            opacity: 0.6,
          }}
        >
          Cohort 1 · 2026
        </div>
      </div>
    </div>
  );
}

'use client';

import VideoBackground from './VideoBackground';

const VIDEO_SRC = '/hls/templates/digital-holo-wave/1080p/index.m3u8';

export default function QuoteSlide() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <VideoBackground src={VIDEO_SRC} />

      <div
        className="relative z-10 flex items-center justify-center w-full h-full"
        style={{ color: 'white' }}
      >
        <div
          className="flex flex-col items-center text-center"
          style={{ maxWidth: '70%', gap: 12 }}
        >
          <p style={{ fontSize: 'clamp(14px, 1.2vw, 20px)', opacity: 0.9 }}>
            EmpowerTours TURBO
          </p>
          <blockquote
            style={{
              fontSize: 'clamp(28px, 4.2vw, 64px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            &ldquo;We don&rsquo;t need permission to build the future. We fund each other.&rdquo;
          </blockquote>
        </div>
      </div>
    </div>
  );
}

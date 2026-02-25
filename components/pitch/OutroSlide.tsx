'use client';

import VideoBackground from './VideoBackground';
import Logo from './Logo';
import { Mail, MapPin, ExternalLink } from 'lucide-react';

const VIDEO_SRC = '/hls/templates/digital-pulse-ring/1080p/index.m3u8';

function TelegramIcon({ size }: { size: string }) {
  return (
    <svg
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.2 4.4L2.4 10.8c-.6.2-.6 1.1 0 1.3l4.5 1.7 1.7 5.5c.2.5.8.7 1.2.4l2.5-2 4.8 3.5c.5.4 1.2.1 1.3-.5L21.8 5.3c.2-.7-.5-1.2-1-.9z" />
      <path d="M8.9 13.8l8.3-6.2" />
    </svg>
  );
}

function DiscordIcon({ size }: { size: string }) {
  return (
    <svg
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.1 12a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8zm5.8 0a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z" fill="white" stroke="none" />
      <path d="M19.7 6.3S18.1 5 16.2 4.7l-.2.5c1.7.4 2.5 1 3.4 1.8-1.5-.7-2.9-1.5-5.4-1.5s-3.9.8-5.4 1.5c.9-.8 1.9-1.5 3.4-1.8l-.2-.5C9.9 5 8.3 6.3 8.3 6.3S6.3 9.1 6 14.5c1.9 2.2 4.8 2.2 4.8 2.2l.6-.8c-1-.4-2.1-1-3-2.1.8.6 2 1.2 4.6 1.2s3.8-.6 4.6-1.2c-.9 1.1-2 1.7-3 2.1l.6.8s2.9 0 4.8-2.2c-.3-5.4-2.3-8.2-2.3-8.2z" />
    </svg>
  );
}

function XIcon({ size }: { size: string }) {
  return (
    <svg
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4l6.5 8L4 20h2l5.5-6.8L16 20h4l-6.8-8.5L20 4h-2l-5.2 6.3L8 4H4z" />
    </svg>
  );
}

const contactItems = [
  { icon: 'telegram', text: 'empowertourschat' },
  { icon: 'discord', text: 'discord.gg/STMVhsxF' },
  { icon: 'x', text: '@EmpowerTours' },
  { icon: 'mail', text: 'admin@empowertours.xyz' },
  { icon: 'web', text: 'turbo-empowertours-production.up.railway.app' },
];

export default function OutroSlide() {
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

        {/* Main content */}
        <div
          className="flex-1 flex flex-col justify-center"
          style={{ padding: '0 clamp(24px, 5.2%, 80px)' }}
        >
          <h2
            style={{
              fontSize: 'clamp(28px, 4.2vw, 64px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            Join Cohort 1 &<br />
            <span style={{ opacity: 0.7 }}>Build on Monad</span>
          </h2>

          <p
            style={{
              fontSize: 'clamp(13px, 1.05vw, 20px)',
              opacity: 0.9,
              lineHeight: 1.5,
              maxWidth: '38%',
              marginTop: '3%',
            }}
          >
            12 months. 52 weeks of curriculum. Community-funded graduating founders.
            Whether you&apos;re an aspiring Web3 builder, a mentor, or an investor
            in the LATAM ecosystem — there&apos;s a place for you in TURBO.
          </p>

          {/* Contact items */}
          <div className="flex flex-col" style={{ gap: 'clamp(12px, 1.2vw, 19px)', marginTop: '3%' }}>
            {contactItems.map((item) => (
              <div key={item.text} className="flex items-center" style={{ gap: 'clamp(10px, 1vw, 16px)' }}>
                <ContactIcon type={item.icon} />
                <span style={{ fontSize: 'clamp(13px, 1.05vw, 20px)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactIcon({ type }: { type: string }) {
  const size = 'clamp(24px, 1.8vw, 32px)';
  switch (type) {
    case 'telegram':
      return <TelegramIcon size={size} />;
    case 'discord':
      return <DiscordIcon size={size} />;
    case 'x':
      return <XIcon size={size} />;
    case 'mail':
      return <Mail style={{ width: size, height: size }} stroke="white" strokeWidth={1.5} fill="none" />;
    case 'web':
      return <ExternalLink style={{ width: size, height: size }} stroke="white" strokeWidth={1.5} fill="none" />;
    case 'mappin':
      return <MapPin style={{ width: size, height: size }} stroke="white" strokeWidth={1.5} fill="none" />;
    default:
      return null;
  }
}

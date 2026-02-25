import { type ReactNode } from 'react';

interface LiquidGlassCardProps {
  children: ReactNode;
  className?: string;
}

export default function LiquidGlassCard({ children, className = '' }: LiquidGlassCardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 'clamp(12px, 1.2vw, 20px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Specular highlight */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 15% 15%, rgba(255,255,255,0.08), transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef, type ReactElement } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react';
import { SlideActiveContext } from './VideoBackground';

interface PresentationProps {
  slides: ReactElement[];
}

export default function Presentation({ slides }: PresentationProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const total = slides.length;

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  const goNext = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, total - 1));
    showControls();
  }, [total, showControls]);

  const goPrev = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
    showControls();
  }, [showControls]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goPrev();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, toggleFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const handleMouseMove = () => showControls();
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [showControls]);

  useEffect(() => {
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Touch swipe navigation
  const touchStartRef = useRef<number | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      touchStartRef.current = e.touches[0].clientX;
    };
    const onEnd = (e: TouchEvent) => {
      if (touchStartRef.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current;
      touchStartRef.current = null;
      if (Math.abs(dx) > 50) {
        if (dx < 0) goNext();
        else goPrev();
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [goNext, goPrev]);

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-black"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {slides.map((slide, index) => {
        const isActive = index === currentSlide;
        const isPast = index < currentSlide;
        let scale = 1;
        let opacity = 0;
        if (isActive) { scale = 1; opacity = 1; }
        else if (isPast) { scale = 0.95; }
        else { scale = 1.05; }

        return (
          <div
            key={index}
            className="absolute inset-0"
            style={{
              opacity,
              transform: `scale(${scale})`,
              transition: 'opacity 500ms ease-in-out, transform 500ms ease-in-out',
              pointerEvents: isActive ? 'auto' : 'none',
              zIndex: isActive ? 1 : 0,
            }}
          >
            <SlideActiveContext.Provider value={isActive}>
              {slide}
            </SlideActiveContext.Provider>
          </div>
        );
      })}

      {/* Controls overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: controlsVisible ? 1 : 0,
          transition: 'opacity 300ms ease',
          zIndex: 50,
        }}
      >
        {/* Top-right keyboard hint */}
        <div
          className="absolute"
          style={{
            top: '3%',
            right: '3%',
            fontSize: 'clamp(9px, 0.85vw, 13px)',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          ← → Navigate · F Fullscreen
        </div>

        {/* Bottom navigation bar */}
        <div
          className="absolute flex items-center justify-between pointer-events-auto"
          style={{ bottom: '3%', left: '5%', right: '5%' }}
        >
          {/* Slide counter */}
          <div
            style={{
              fontSize: 'clamp(11px, 1vw, 15px)',
              color: 'rgba(255,255,255,0.5)',
              fontVariantNumeric: 'tabular-nums',
              minWidth: '3em',
            }}
          >
            {currentSlide + 1} / {total}
          </div>

          {/* Progress dots */}
          <div className="flex items-center" style={{ gap: 6 }}>
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentSlide(i); showControls(); }}
                className="rounded-full"
                style={{
                  width: i === currentSlide ? 24 : 6,
                  height: 6,
                  backgroundColor: i === currentSlide
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(255,255,255,0.3)',
                  transition: 'width 300ms ease, background-color 300ms ease',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {/* Prev/Next + Fullscreen */}
          <div className="flex items-center" style={{ gap: 8 }}>
            <NavButton
              onClick={goPrev}
              disabled={currentSlide === 0}
            >
              <ChevronLeft style={{ width: 'clamp(14px, 1.2vw, 20px)', height: 'clamp(14px, 1.2vw, 20px)' }} />
            </NavButton>
            <NavButton
              onClick={goNext}
              disabled={currentSlide === total - 1}
            >
              <ChevronRight style={{ width: 'clamp(14px, 1.2vw, 20px)', height: 'clamp(14px, 1.2vw, 20px)' }} />
            </NavButton>
            <div style={{ width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <NavButton onClick={toggleFullscreen}>
              {isFullscreen
                ? <Minimize style={{ width: 'clamp(13px, 1.1vw, 18px)', height: 'clamp(13px, 1.1vw, 18px)' }} />
                : <Maximize style={{ width: 'clamp(13px, 1.1vw, 18px)', height: 'clamp(13px, 1.1vw, 18px)' }} />
              }
            </NavButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const baseColor = disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)';
  const hoverColor = 'rgba(255,255,255,0.9)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color: !disabled && hovered ? hoverColor : baseColor,
        backgroundColor: hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
        transition: 'color 200ms, background-color 200ms',
        padding: 4,
        borderRadius: 4,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

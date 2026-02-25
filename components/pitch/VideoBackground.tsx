'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import Hls from 'hls.js';

/** Context provided by Presentation — true when the slide is the active one. */
export const SlideActiveContext = createContext(false);

interface VideoBackgroundProps {
  src: string;
}

export default function VideoBackground({ src }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isActive = useContext(SlideActiveContext);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Only load HLS when the slide is active
    if (!isActive) {
      // Tear down any existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute('src');
      video.load();
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src;
      const onLoaded = () => video.play().catch(() => {});
      video.addEventListener('loadedmetadata', onLoaded);
      return () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeAttribute('src');
        video.load();
      };
    }
  }, [src, isActive]);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full object-cover"
      autoPlay
      loop
      muted
      playsInline
      preload="none"
    />
  );
}

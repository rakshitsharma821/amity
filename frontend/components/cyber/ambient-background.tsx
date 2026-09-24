'use client';

import React, { useEffect, useRef } from 'react';

interface AmbientBackgroundProps {
  className?: string;
  showHexRain?: boolean;
}

export default function AmbientBackground({
  className = '',
  showHexRain = true,
}: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!showHexRain) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Draw a subtle static pattern and stop
      const width = (canvas.width = window.innerWidth);
      const height = (canvas.height = window.innerHeight);
      ctx.fillStyle = '#0a0a0b';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Drifting hex characters pool
    const hexChars = ['0x4F', '0x1A', '0x9C', '0xFF', '0x00', '0x7B', '0x2E', '0x88', '0xD3', '0x5C', '0x0F', '0x32'];
    
    // Spawn a sparse set of particles (around 24 particles for ultra-low CPU)
    const particleCount = 20;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      char: hexChars[Math.floor(Math.random() * hexChars.length)],
      speedY: 0.25 + Math.random() * 0.45,
      opacity: 0.03 + Math.random() * 0.08,
      size: 10 + Math.random() * 3,
    }));

    let isVisible = true;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      ctx.font = '11px "JetBrains Mono", monospace';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
          p.char = hexChars[Math.floor(Math.random() * hexChars.length)];
        }

        ctx.fillStyle = `rgba(163, 230, 53, ${p.opacity})`;
        ctx.fillText(p.char, p.x, p.y);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [showHexRain]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none ${className}`}
    >
      {/* Base Obsidian Background */}
      <div className="absolute inset-0 bg-[#0a0a0b]" />

      {/* Cyber Grid Floor */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Slow Technical Scanline Pass */}
      <div
        className="absolute inset-0 opacity-[0.03] animate-scanline-slow"
        style={{
          backgroundImage:
            'linear-gradient(180deg, transparent 0%, rgba(163, 230, 53, 0.4) 50%, transparent 100%)',
          backgroundSize: '100% 8px',
        }}
      />

      {/* Radial Vignette to keep focus center */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 20%, transparent 40%, #0a0a0b 95%)',
        }}
      />

      {/* Drifting faint hex 2D canvas */}
      {showHexRain && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}
    </div>
  );
}

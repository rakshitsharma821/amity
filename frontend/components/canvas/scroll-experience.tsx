'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import SocHudOverlay from '@/components/cyber/soc-hud-overlay';

// Dynamically import Three.js 3D canvas with ssr: false
const ScrollUniverseCanvas = dynamic(
  () => import('@/components/canvas/scroll-universe-canvas'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 pointer-events-none z-0 bg-[#0a0a0b]" />
    ),
  }
);

export default function ScrollExperience() {
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  return (
    <>
      {/* 3D Threat Map Canvas — Persistent, Immediate, and Full Fidelity */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ScrollUniverseCanvas onLogAlert={setActiveAlert} />
      </div>

      {/* Cyber SOC Command Console HUD */}
      <SocHudOverlay activeLog={activeAlert} />
    </>
  );
}

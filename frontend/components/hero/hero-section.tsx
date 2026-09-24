'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowRight, Zap, Radio } from 'lucide-react';
import { siteConfig } from '@/site.config';
import DecodeText from '@/components/cyber/decode-text';

export default function HeroSection() {
  return (
    <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-28 pb-16 bg-transparent">
      {/* Foreground Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* SOC Section Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-terminal/40 text-terminal font-mono text-xs font-bold mb-6 shadow-[0_0_16px_rgba(57,255,20,0.2)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-terminal animate-pulse" />
          <span>[ 00 / HERO ] — ZERO-TRUST API THREAT MAP</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-muted-heading leading-[1.1] mb-6">
          <DecodeText text="Find the API vulnerability" as="span" /> <br />
          <span className="text-acid drop-shadow-[0_0_35px_rgba(163,230,53,0.35)]">before the breach</span> <br />
          <span className="text-alert-red drop-shadow-[0_0_35px_rgba(255,59,71,0.35)]">headline does.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-body mb-10 leading-relaxed font-mono text-sm sm:text-base">
          {siteConfig.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-acid hover:bg-acid-hover text-obsidian font-bold text-sm shadow-[0_4px_20px_rgba(163,230,53,0.3)] transition-all transform hover:-translate-y-0.5 font-mono"
          >
            <Shield className="w-4 h-4" />
            <span>&gt; Scan an API</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
          <Link
            href="/docs"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-heading border border-white/20 hover:border-white/40 text-sm font-semibold transition-all backdrop-blur-md transform hover:-translate-y-0.5 font-mono"
          >
            <Zap className="w-4 h-4 text-terminal" />
            <span>Read Architecture Docs</span>
          </Link>
        </div>

        {/* Real Metrics Banner with HUD Frame */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/10 max-w-3xl mx-auto text-left glass-panel rounded-xl p-6 backdrop-blur-md hud-frame">
          <div>
            <div className="text-2xl font-bold font-mono text-muted-heading">0.35s</div>
            <div className="text-xs font-mono text-muted-dim uppercase mt-0.5">Scan Latency</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-terminal">0% Leak</div>
            <div className="text-xs font-mono text-muted-dim uppercase mt-0.5">Token Redaction</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-muted-heading">Dual-User</div>
            <div className="text-xs font-mono text-muted-dim uppercase mt-0.5">BOLA Precision</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-terminal">Mandatory</div>
            <div className="text-xs font-mono text-muted-dim uppercase mt-0.5">DNS / Host Ownership</div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Radio, Activity } from 'lucide-react';

export default function SocHudOverlay({
  activeLog,
}: {
  activeLog?: string | null;
}) {
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimestamp(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden font-mono text-[11px]">
      {/* Scanline CRT overlay */}
      <div className="absolute inset-0 scanline-overlay opacity-30" />

      {/* Screen Corner HUD Brackets */}
      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-terminal opacity-70" />
      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-terminal opacity-70" />
      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-terminal opacity-70" />
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-terminal opacity-70" />

      {/* Top Status Bar Telemetry */}
      <div className="absolute top-4 left-10 flex items-center gap-3 text-muted-dim">
        <div className="flex items-center gap-1.5 text-terminal font-bold">
          <Radio className="w-3.5 h-3.5 animate-pulse text-terminal" />
          <span>RADAR: PASSIVE</span>
        </div>
        <span>|</span>
        <div className="hidden sm:flex items-center gap-1.5 text-muted-dim">
          <Activity className="w-3 h-3 text-muted-dim" />
          <span>SYS.LATENCY: 0.35s</span>
        </div>
        <span>|</span>
        <span className="hidden md:inline px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-muted-body">
          SIMULATION
        </span>
      </div>

      <div className="absolute top-4 right-10 hidden sm:flex items-center gap-2 text-muted-dim">
        <span className="w-2 h-2 rounded-full bg-terminal animate-ping" />
        <span className="text-muted-body">{timestamp}</span>
      </div>

      {/* Bottom Terminal Alert Log Banner (when radar detects flaw) */}
      {activeLog && (
        <div className="absolute bottom-6 right-6 max-w-md bg-[#111114]/95 border border-alert-red rounded-lg p-3 shadow-[0_0_30px_rgba(255,59,71,0.3)] backdrop-blur-md transition-all animate-fade-in flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-alert-red animate-ping mt-1 flex-shrink-0" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-alert-red font-bold">[!] THREAT IDENTIFIED</span>
              <span className="px-1.5 py-0.2 bg-alert-red/20 text-red-200 text-[10px] font-bold rounded border border-alert-red/40">
                SIMULATION
              </span>
            </div>
            <div className="text-white text-xs font-mono">{activeLog}</div>
            <div className="text-[10px] text-terminal font-bold">&gt; REMEDIATION: ISOLATING ROUTE PARAMETERS</div>
          </div>
        </div>
      )}
    </div>
  );
}

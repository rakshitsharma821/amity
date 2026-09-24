import React from 'react';

/**
 * StaticConstellationPoster
 * Pure CSS/SVG poster rendered immediately before any 3D scripts load.
 * Guarantees LCP is instant and CLS is strictly 0.00.
 * Also acts as the permanent fallback for slow connections (2G/3G) and Save-Data.
 */
export default function StaticConstellationPoster({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0a0a0b] ${className}`}
      aria-hidden="true"
    >
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(57,255,20,0.06),transparent_60%)]" />

      {/* Grid Floor */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_bottom,transparent_0%,rgba(10,10,11,0.8)_80%),linear-gradient(rgba(39,39,42,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(39,39,42,0.3)_1px,transparent_1px)] bg-[size:100%_100%,40px_40px,40px_40px] [transform:perspective(600px)_rotateX(60deg)] opacity-40" />

      {/* Static Constellation SVG */}
      <svg
        className="w-full h-full opacity-60"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Network Edges */}
        <line x1="300" y1="280" x2="480" y2="200" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.25" />
        <line x1="480" y1="200" x2="600" y2="350" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.25" />
        <line x1="600" y1="350" x2="850" y2="240" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.25" />
        <line x1="850" y1="240" x2="950" y2="450" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.25" />
        <line x1="950" y1="450" x2="600" y2="350" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.25" />
        <line x1="600" y1="350" x2="450" y2="520" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.25" />
        <line x1="450" y1="520" x2="300" y2="280" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.25" />
        <line x1="450" y1="520" x2="720" y2="580" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.25" />
        <line x1="720" y1="580" x2="950" y2="450" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.25" />

        {/* Attack Line to BOLA Node */}
        <line x1="1100" y1="120" x2="850" y2="240" stroke="#ff3b47" strokeWidth="1.5" strokeDasharray="6 4" strokeOpacity="0.5" />

        {/* Scanner Ring Sweep Outline */}
        <ellipse cx="600" cy="360" rx="340" ry="140" stroke="#d9f99d" strokeWidth="1.2" strokeOpacity="0.3" strokeDasharray="8 6" />

        {/* Central Shield Graphic */}
        <polygon points="600,310 640,335 640,385 600,410 560,385 560,335" fill="#18181b" stroke="#39ff14" strokeWidth="1.5" strokeOpacity="0.6" />

        {/* Healthy Nodes (Terminal Green) */}
        <circle cx="300" cy="280" r="6" fill="#39ff14" />
        <circle cx="300" cy="280" r="12" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.4" />

        <circle cx="480" cy="200" r="6" fill="#39ff14" />
        <circle cx="480" cy="200" r="12" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.4" />

        <circle cx="950" cy="450" r="6" fill="#39ff14" />
        <circle cx="950" cy="450" r="12" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.4" />

        <circle cx="450" cy="520" r="6" fill="#39ff14" />
        <circle cx="450" cy="520" r="12" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.4" />

        <circle cx="720" cy="580" r="6" fill="#39ff14" />
        <circle cx="720" cy="580" r="12" stroke="#39ff14" strokeWidth="1" strokeOpacity="0.4" />

        {/* Vulnerable Nodes (Alert Red) */}
        <circle cx="850" cy="240" r="7" fill="#ff3b47" />
        <circle cx="850" cy="240" r="16" stroke="#ff3b47" strokeWidth="1.5" strokeOpacity="0.6" />
        <text x="850" y="275" fill="#ff3b47" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
          BOLA DETECTED
        </text>

        <circle cx="300" cy="420" r="6" fill="#ff3b47" />
        <circle cx="300" cy="420" r="14" stroke="#ff3b47" strokeWidth="1" strokeOpacity="0.5" />
      </svg>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Info } from 'lucide-react';
import { cyberEase } from '@/lib/motion';

export function CodeBlock({
  code,
  language = 'bash',
  label = 'TERMINAL',
}: {
  code: string;
  language?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl bg-black/60 border border-white/10 overflow-hidden font-mono text-xs my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.02]">
        <span className="text-[10px] text-muted-dim font-bold">{label}</span>
        <button
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-muted-body hover:text-white transition-colors text-[11px]"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1 text-acid font-bold"
              >
                <Check className="w-3.5 h-3.5 text-acid" />
                <span>COPIED</span>
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>COPY</span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-muted-heading leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function FindingAnatomyCard() {
  const [activePart, setActivePart] = useState<string | null>('severity');

  const partsMeta: Record<string, { title: string; desc: string; color: string }> = {
    id: {
      title: 'Canonical Finding Identifier',
      desc: 'Deterministic hash generated from the endpoint schema template and vulnerability class. Prevents duplicate noise across multiple runs.',
      color: '#a3e635',
    },
    severity: {
      title: 'CVSS-Aligned Severity Rating',
      desc: 'High: direct authorization bypass exposing private PII/tenant data. Medium: rate limit bypass or information disclosure.',
      color: '#ff3b47',
    },
    evidence: {
      title: 'Cryptographic Proof & Sanitized DTO',
      desc: 'Shows exactly which fields were exfiltrated during cross-tenant verification, with tokens and credit cards securely masked.',
      color: '#ffb020',
    },
    reproduction: {
      title: 'Runnable Terminal Proof-of-Concept',
      desc: 'Exact cURL command that an engineer or penetration tester can execute in terminal to verify the vulnerability within seconds.',
      color: '#a3e635',
    },
    recommendation: {
      title: 'Data-Layer Remediation Guidance',
      desc: 'Concrete code pattern recommendations (e.g. Prisma, SQL row-level security, or ORM filter enforcement) to eliminate the bug.',
      color: '#39ff14',
    },
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-xs">
        <span className="text-muted-body flex items-center gap-1.5 font-bold">
          <Info className="w-3.5 h-3.5 text-acid" />
          INTERACTIVE ANATOMY OF A FINDING
        </span>
        <span className="text-[10px] text-muted-dim">Hover keys below to inspect</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Interactive JSON View */}
        <div className="p-4 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-muted-body space-y-1.5">
          <div className="text-white">&#123;</div>
          <div
            onMouseEnter={() => setActivePart('id')}
            className={`pl-4 cursor-pointer p-1 rounded transition-colors ${
              activePart === 'id' ? 'bg-acid/15 text-acid' : 'hover:bg-white/5'
            }`}
          >
            &quot;id&quot;: &quot;SENTINEL-BOLA-01&quot;,
          </div>
          <div className="pl-4 text-white/70">
            &quot;title&quot;: &quot;Broken Object Level Authorization in /orders/&#123;id&#125;&quot;,
          </div>
          <div
            onMouseEnter={() => setActivePart('severity')}
            className={`pl-4 cursor-pointer p-1 rounded transition-colors ${
              activePart === 'severity' ? 'bg-alert-red/20 text-alert-red' : 'hover:bg-white/5'
            }`}
          >
            &quot;severity&quot;: &quot;High&quot;,
          </div>
          <div className="pl-4 text-white/70">
            &quot;endpoint&quot;: &quot;GET /orders/&#123;id&#125;&quot;,
          </div>
          <div
            onMouseEnter={() => setActivePart('evidence')}
            className={`pl-4 cursor-pointer p-1 rounded transition-colors ${
              activePart === 'evidence' ? 'bg-warn-amber/20 text-warn-amber' : 'hover:bg-white/5'
            }`}
          >
            &quot;evidence&quot;: &#123; &quot;user_a_saw_victim_data&quot;: true, &quot;leaked_pan&quot;: &quot;4532-••••-8910&quot; &#125;,
          </div>
          <div
            onMouseEnter={() => setActivePart('reproduction')}
            className={`pl-4 cursor-pointer p-1 rounded transition-colors ${
              activePart === 'reproduction' ? 'bg-acid/15 text-acid' : 'hover:bg-white/5'
            }`}
          >
            &quot;reproduction&quot;: &quot;curl -X GET https://api.corp.internal/orders/3 ...&quot;,
          </div>
          <div
            onMouseEnter={() => setActivePart('recommendation')}
            className={`pl-4 cursor-pointer p-1 rounded transition-colors ${
              activePart === 'recommendation' ? 'bg-terminal/20 text-terminal' : 'hover:bg-white/5'
            }`}
          >
            &quot;recommendation&quot;: &quot;Enforce ownership check: WHERE id = :id AND user_id = :current_user&quot;
          </div>
          <div className="text-white">&#125;</div>
        </div>

        {/* Dynamic Explanation Callout */}
        <div className="p-4 rounded-xl bg-obsidian-card border border-white/10 flex flex-col justify-center">
          {activePart && partsMeta[activePart] ? (
            <motion.div
              key={activePart}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: cyberEase }}
              className="space-y-2"
            >
              <div className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: partsMeta[activePart].color }}
                />
                {partsMeta[activePart].title}
              </div>
              <p className="text-xs text-muted-body leading-relaxed">
                {partsMeta[activePart].desc}
              </p>
            </motion.div>
          ) : (
            <div className="text-xs text-muted-dim font-mono">
              Hover over any highlighted key in the JSON object to view architectural analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

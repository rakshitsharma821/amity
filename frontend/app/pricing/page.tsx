'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Shield, ArrowRight, Info, Terminal, AlertCircle } from 'lucide-react';
import AmbientBackground from '@/components/cyber/ambient-background';
import { fadeUpVariant, staggerContainer, cyberEase } from '@/lib/motion';

export default function PricingPage() {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistEmail.includes('@')) {
      setWaitlistStatus('error');
      setErrorMessage('INVALID_IDENTITY: Please enter a valid engineering email.');
      return;
    }

    setWaitlistStatus('loading');
    // Simulate telemetry registration
    setTimeout(() => {
      setWaitlistStatus('success');
    }, 600);
  };

  return (
    <div className="relative pt-32 pb-24 max-w-5xl mx-auto px-6">
      <AmbientBackground />

      {/* Header */}
      <motion.div
        variants={fadeUpVariant}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mb-16"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-acid/10 border border-acid/30 text-acid font-mono text-xs font-semibold mb-4">
          <span>TRANSPARENT PRICING</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-muted-heading mb-4">
          Free during Public Beta. No credit card required.
        </h1>
        <p className="text-lg text-muted-body leading-relaxed">
          We believe zero-trust API security should be accessible to every engineering team. While in public beta, full scanning capabilities are available at no charge for verified targets.
        </p>
      </motion.div>

      {/* Pricing Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
      >
        {/* Public Beta Card with Rotating Conic Gradient Border */}
        <motion.div
          variants={fadeUpVariant}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2, ease: cyberEase }}
          className="relative p-[1.5px] rounded-2xl overflow-hidden group shadow-[0_16px_48px_rgba(163,230,53,0.12)]"
        >
          {/* Rotating Conic Gradient Border Glow */}
          <div
            className="absolute -inset-[100%] animate-spin-slow opacity-75 group-hover:opacity-100 transition-opacity"
            style={{
              background:
                'conic-gradient(from 0deg at 50% 50%, #0a0a0b 0deg, #a3e635 120deg, #0a0a0b 180deg, #a3e635 300deg, #0a0a0b 360deg)',
            }}
          />

          <div className="hud-frame relative rounded-2xl p-8 bg-[#0e0e11] h-full flex flex-col justify-between">
            <div className="absolute top-5 right-5">
              <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-acid text-obsidian shadow-[0_0_10px_rgba(163,230,53,0.4)]">
                ACTIVE BETA
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-muted-heading mb-2">Public Beta</h3>
              <p className="text-sm text-muted-body mb-6">
                Complete automated BOLA, data-leak, and rate-limiting scanning for your engineering team.
              </p>

              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-muted-dim font-mono text-sm">/ free during beta</span>
              </div>

              <ul className="space-y-3.5 text-sm text-muted-heading mb-8">
                {[
                  'Unlimited verified target domains',
                  'Dual-user BOLA & authorization auditing',
                  'ISO/IEC 7812 Luhn payment card detection',
                  'Plaintext password & secret scanner',
                  'OpenAPI 3.0 & 3.1 specification support',
                  'Exportable JSON reports & cURL PoC generation',
                  'Mandatory domain ownership verification guardrail',
                  'Community GitHub issue support',
                ].map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-acid flex-shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/dashboard"
              className="w-full text-center py-3.5 rounded-lg bg-acid hover:bg-acid-hover text-obsidian font-bold text-sm shadow-[0_4px_20px_rgba(163,230,53,0.25)] transition-all transform hover:-translate-y-0.5"
            >
              Start Scanning for Free
            </Link>
          </div>
        </motion.div>

        {/* Future Enterprise / Self-Hosted Waitlist */}
        <motion.div
          variants={fadeUpVariant}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2, ease: cyberEase }}
          className="hud-frame glass-panel rounded-2xl p-8 relative flex flex-col justify-between border-white/10 hover:border-white/20 transition-all"
        >
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-bold text-muted-heading">Enterprise & On-Prem</h3>
              <span className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-white/5 border border-white/10 text-muted-dim">
                FUTURE PLAN
              </span>
            </div>

            <p className="text-sm text-muted-body mb-6">
              For security compliance teams requiring dedicated VPC deployment, custom SSO, and air-gapped support.
            </p>

            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-3xl font-bold text-white">Join Waitlist</span>
              <span className="text-muted-dim font-mono text-xs">(in development)</span>
            </div>

            <ul className="space-y-3.5 text-sm text-muted-body mb-8">
              {[
                'Self-hosted Docker / Kubernetes deployment',
                'Air-gapped internal network scanning',
                'Custom SAML 2.0 / Okta SSO integration',
                'Role-Based Access Control (RBAC)',
                'Automated Slack & PagerDuty alerts',
                'Dedicated compliance SLA and audit logs',
              ].map((feat) => (
                <li key={feat} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-muted-dim flex-shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Fast Waitlist Form with Shake and Terminal Confirmation */}
          <div>
            {waitlistStatus === 'success' ? (
              <div className="p-3.5 rounded-lg bg-black/60 border border-acid/40 font-mono text-xs text-acid">
                <div className="flex items-center gap-2 mb-1">
                  <Terminal className="w-3.5 h-3.5 text-acid" />
                  <span className="font-bold">&gt; request received</span>
                </div>
                <div className="text-muted-body text-[11px]">
                  Priority waitlist telemetry recorded for {waitlistEmail}. You will be notified upon VPC release.
                </div>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-2">
                <motion.div
                  animate={waitlistStatus === 'error' ? { x: [-6, 6, -5, 5, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className="flex gap-2"
                >
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => {
                      setWaitlistEmail(e.target.value);
                      if (waitlistStatus === 'error') setWaitlistStatus('idle');
                    }}
                    placeholder="architect@corp.internal"
                    className="flex-1 px-3 py-2.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white placeholder-muted-dim focus:outline-none focus:border-acid font-mono"
                  />
                  <button
                    type="submit"
                    disabled={waitlistStatus === 'loading'}
                    className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-all font-mono"
                  >
                    {waitlistStatus === 'loading' ? 'QUEUEING...' : 'NOTIFY ME'}
                  </button>
                </motion.div>

                {waitlistStatus === 'error' && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-alert-red">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Honest Commitment */}
      <motion.div
        variants={fadeUpVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="hud-frame p-6 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3.5 text-xs sm:text-sm text-muted-body"
      >
        <Info className="w-5 h-5 flex-shrink-0 text-acid mt-0.5" />
        <div>
          <strong className="text-white">Our Pricing Philosophy:</strong> We do not use artificially restricted tiers or hidden upgrade paywalls. When paid enterprise plans launch in the future, the open-source CLI engine will remain permanently free and self-hostable.
        </div>
      </motion.div>
    </div>
  );
}

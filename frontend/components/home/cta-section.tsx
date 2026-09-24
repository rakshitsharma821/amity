'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { GithubIcon } from '@/components/icons/social-icons';
import { siteConfig } from '@/site.config';
import { useAuth } from '@/components/auth/auth-context';
import DecodeText from '@/components/cyber/decode-text';

export default function CtaSection() {
  const { user, openAuthModal } = useAuth();

  return (
    <section className="py-24 border-t border-white/10 bg-transparent relative">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="glass-panel-elevated rounded-3xl p-8 sm:p-14 relative overflow-hidden border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] hud-frame">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-warn-amber/15 border border-warn-amber/40 text-amber-200 font-mono text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-warn-amber" />
              <span>ETHICAL AUDITING MANDATE</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-terminal/10 border border-terminal/30 text-terminal font-mono text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-terminal" />
              <span>[ 05 / SECURE ] — SHIELD ARMED</span>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-muted-heading mb-4 font-mono">
            <DecodeText text="Verify your API authorization security today." as="span" />
          </h2>

          <p className="max-w-xl mx-auto text-base sm:text-lg text-muted-body mb-10 leading-relaxed font-mono text-sm">
            Free during public beta for engineering and security teams. Strict domain ownership verification guarantees ethical, non-destructive evaluations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-acid hover:bg-acid-hover text-obsidian font-bold text-sm shadow-[0_4px_20px_rgba(163,230,53,0.3)] transition-all transform hover:-translate-y-0.5 font-mono"
              >
                <Shield className="w-4 h-4" />
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => openAuthModal('signup')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-acid hover:bg-acid-hover text-obsidian font-bold text-sm shadow-[0_4px_20px_rgba(163,230,53,0.3)] transition-all transform hover:-translate-y-0.5 font-mono"
              >
                <Shield className="w-4 h-4" />
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-heading border border-white/20 hover:border-white/40 text-sm font-semibold transition-all backdrop-blur-md font-mono"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Inspect on GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

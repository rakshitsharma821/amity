'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, MessageSquare, Mail } from 'lucide-react';
import { GithubIcon, TwitterIcon } from '@/components/icons/social-icons';
import { siteConfig } from '@/site.config';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-obsidian pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-obsidian-card border border-acid flex items-center justify-center text-acid shadow-[0_0_12px_rgba(163,230,53,0.25)] transition-all group-hover:shadow-[0_0_18px_rgba(163,230,53,0.45)]">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-muted-heading tracking-tight group-hover:text-white transition-colors">
                {siteConfig.name}
              </span>
            </Link>

            <p className="text-sm text-muted-body max-w-sm leading-relaxed">
              {siteConfig.tagline} Automated zero-trust vulnerability scanner targeting Broken Object Level Authorization (BOLA), excessive data exposure, and broken rate limits.
            </p>

            {/* SOC Operational Status Beacon */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[11px] font-mono text-muted-body">
              <span className="w-2 h-2 rounded-full bg-terminal animate-pulse" />
              <span>TELEMETRY ONLINE // 99.98% AUDIT UPTIME</span>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 hover:border-acid/40 flex items-center justify-center text-muted-body hover:text-white hover:shadow-[0_0_10px_rgba(163,230,53,0.25)] transition-all"
                aria-label="GitHub Repository"
              >
                <GithubIcon className="w-4 h-4" />
              </a>
              <a
                href={siteConfig.links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 hover:border-acid/40 flex items-center justify-center text-muted-body hover:text-white hover:shadow-[0_0_10px_rgba(163,230,53,0.25)] transition-all"
                aria-label="Twitter / X"
              >
                <TwitterIcon className="w-4 h-4" />
              </a>
              <a
                href={siteConfig.links.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 hover:border-acid/40 flex items-center justify-center text-muted-body hover:text-white hover:shadow-[0_0_10px_rgba(163,230,53,0.25)] transition-all"
                aria-label="Discord Community"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 hover:border-acid/40 flex items-center justify-center text-muted-body hover:text-white hover:shadow-[0_0_10px_rgba(163,230,53,0.25)] transition-all"
                aria-label="Contact Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted-dim mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              {siteConfig.footer.product.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-body hover:text-acid font-mono transition-colors flex items-center gap-1 group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 text-acid transition-opacity text-xs">&gt;</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted-dim mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5">
              {siteConfig.footer.resources.map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-body hover:text-acid font-mono transition-colors flex items-center gap-1 group"
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-acid transition-opacity text-xs">&gt;</span>
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-sm text-muted-body hover:text-acid font-mono transition-colors flex items-center gap-1 group"
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-acid transition-opacity text-xs">&gt;</span>
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted-dim mb-4">
              Legal & Trust
            </h4>
            <ul className="space-y-2.5">
              {siteConfig.footer.legal.map((item) => (
                <li key={item.href}>
                  {item.href.startsWith('mailto:') ? (
                    <a
                      href={item.href}
                      className="text-sm text-muted-body hover:text-acid font-mono transition-colors flex items-center gap-1 group"
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-acid transition-opacity text-xs">&gt;</span>
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-sm text-muted-body hover:text-acid font-mono transition-colors flex items-center gap-1 group"
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-acid transition-opacity text-xs">&gt;</span>
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-dim">
          <p>
            © {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.
          </p>

          <p className="font-mono text-center sm:text-right">
            Privacy-first infrastructure: zero tracking cookies, zero third-party behavioral pixels.
          </p>
        </div>
      </div>
    </footer>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, AlertTriangle, Lock, Unlock, Zap, Server } from 'lucide-react';

export function BolaLaneSimulation() {
  const [step, setStep] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || shouldReduceMotion) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2200);
    return () => clearInterval(interval);
  }, [isInView, shouldReduceMotion]);

  return (
    <div
      ref={containerRef}
      className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden"
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 font-mono text-xs">
        <span className="text-muted-body flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-alert-red animate-pulse" />
          SIMULATION 01 // BOLA DUAL-TENANT LANE JUMP
        </span>
        <span className="px-2 py-0.5 rounded bg-alert-red/10 text-alert-red border border-alert-red/20 font-bold">
          OWASP API1
        </span>
      </div>

      <div className="space-y-4 font-mono text-xs">
        {/* User A Tenant */}
        <div className="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-acid/15 border border-acid/30 text-acid flex items-center justify-center font-bold">
              A
            </div>
            <div>
              <div className="text-white font-medium">Tenant A (Auditor)</div>
              <div className="text-[10px] text-muted-dim">Bearer Token: eyJhbG...usrA</div>
            </div>
          </div>
          <span className="text-[10px] text-acid bg-acid/10 px-2 py-0.5 rounded border border-acid/20">
            AUTHENTICATED
          </span>
        </div>

        {/* Request Packet Trajectory */}
        <div className="relative py-2 px-3 bg-obsidian-card rounded border border-white/5">
          <div className="flex items-center justify-between text-[11px] text-muted-body mb-2">
            <span>GET /api/v2/tenants/tenant_b/financial_records</span>
            <span className="text-white/40">IDOR PROBE</span>
          </div>

          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all duration-700 ${
                step >= 2 ? 'bg-alert-red' : 'bg-acid'
              }`}
              style={{
                width: step === 0 ? '15%' : step === 1 ? '55%' : step === 2 ? '90%' : '100%',
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-muted-dim">Tenant Isolation Boundary:</span>
            {step >= 2 ? (
              <span className="text-alert-red flex items-center gap-1 font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                VULNERABLE (User A read User B records)
              </span>
            ) : (
              <span className="text-acid flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Testing Cross-Tenant Read
              </span>
            )}
          </div>
        </div>

        {/* User B Tenant */}
        <div className="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-warn-amber/15 border border-warn-amber/30 text-warn-amber flex items-center justify-center font-bold">
              B
            </div>
            <div>
              <div className="text-white font-medium">Tenant B (Target)</div>
              <div className="text-[10px] text-muted-dim">Private Bucket: s3://corp-b-vault</div>
            </div>
          </div>
          <span className="text-[10px] text-warn-amber bg-warn-amber/10 px-2 py-0.5 rounded border border-warn-amber/20">
            PROTECTED DATA
          </span>
        </div>
      </div>
    </div>
  );
}

export function DataExposureSimulation() {
  const [isMasked, setIsMasked] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || shouldReduceMotion) return;
    const interval = setInterval(() => {
      setIsMasked((prev) => !prev);
    }, 2800);
    return () => clearInterval(interval);
  }, [isInView, shouldReduceMotion]);

  return (
    <div
      ref={containerRef}
      className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden"
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 font-mono text-xs">
        <span className="text-muted-body flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-warn-amber animate-pulse" />
          SIMULATION 02 // DATA EXPOSURE & LUHN CARD DETECTOR
        </span>
        <span className="px-2 py-0.5 rounded bg-warn-amber/10 text-warn-amber border border-warn-amber/20 font-bold">
          PCI-DSS / API3
        </span>
      </div>

      <div className="font-mono text-xs bg-black/60 rounded-lg p-4 border border-white/10 space-y-1.5 text-muted-body overflow-x-auto">
        <div>
          <span className="text-muted-dim font-bold">HTTP/1.1 200 OK</span>
        </div>
        <div>
          <span className="text-muted-dim">Content-Type:</span> application/json
        </div>
        <div className="text-white pt-2">&#123;</div>
        <div className="pl-4">
          <span className="text-acid">&quot;id&quot;</span>: <span className="text-white">84192</span>,
        </div>
        <div className="pl-4">
          <span className="text-acid">&quot;account_name&quot;</span>: <span className="text-white">&quot;Acme Corp Holdings&quot;</span>,
        </div>
        <div className="pl-4 flex items-center gap-2">
          <span className="text-acid">&quot;card_primary&quot;</span>:{' '}
          {isMasked ? (
            <span className="text-acid bg-acid/10 px-2 py-0.5 rounded border border-acid/30">
              &quot;4532-••••-••••-8910&quot; [SANITIZED]
            </span>
          ) : (
            <span className="text-alert-red bg-alert-red/10 px-2 py-0.5 rounded border border-alert-red/30 font-bold animate-pulse">
              &quot;4532-8219-0941-8910&quot; [LUHN MATCH]
            </span>
          )}
        </div>
        <div className="pl-4 flex items-center gap-2">
          <span className="text-acid">&quot;social_security&quot;</span>:{' '}
          {isMasked ? (
            <span className="text-acid bg-acid/10 px-2 py-0.5 rounded border border-acid/30">
              &quot;•••-••-1920&quot; [MASKED]
            </span>
          ) : (
            <span className="text-alert-red bg-alert-red/10 px-2 py-0.5 rounded border border-alert-red/30 font-bold">
              &quot;412-89-1920&quot; [PII BREACH]
            </span>
          )}
        </div>
        <div className="text-white">&#125;</div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs font-mono">
        <span className="text-muted-dim">Deep AST Inspector:</span>
        <span className={isMasked ? 'text-acid' : 'text-alert-red font-semibold'}>
          {isMasked ? 'STATUS: ZERO LEAKS DETECTED' : 'ALERT: UNMASKED SENSITIVE DTO OBJECTS'}
        </span>
      </div>
    </div>
  );
}

export function RateLimitSimulation() {
  const [burstCount, setBurstCount] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || shouldReduceMotion) return;
    const interval = setInterval(() => {
      setBurstCount((prev) => {
        if (prev >= 60) return 0;
        return prev + 15;
      });
    }, 1100);
    return () => clearInterval(interval);
  }, [isInView, shouldReduceMotion]);

  const isThrottled = burstCount >= 45;

  return (
    <div
      ref={containerRef}
      className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden"
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 font-mono text-xs">
        <span className="text-muted-body flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-acid animate-pulse" />
          SIMULATION 03 // BOUNDED BURST RATE-LIMIT AUDIT
        </span>
        <span className="px-2 py-0.5 rounded bg-acid/10 text-acid border border-acid/20 font-bold">
          OWASP API4
        </span>
      </div>

      <div className="space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-body">Dispatched Safe Bursts:</span>
          <span className="text-white font-bold">{burstCount} / 50 reqs</span>
        </div>

        {/* Burst Packets Grid */}
        <div className="grid grid-cols-10 gap-1.5 p-3 bg-black/40 rounded-lg border border-white/10">
          {Array.from({ length: 50 }).map((_, i) => {
            const isFired = i < burstCount;
            const isOverLimit = i >= 40 && isFired;
            return (
              <div
                key={i}
                className={`h-4 rounded-sm transition-all duration-200 ${
                  !isFired
                    ? 'bg-white/5 border border-white/10'
                    : isOverLimit
                    ? 'bg-alert-red border border-alert-red shadow-[0_0_6px_rgba(255,59,71,0.5)]'
                    : 'bg-acid border border-acid shadow-[0_0_6px_rgba(163,230,53,0.4)]'
                }`}
              />
            );
          })}
        </div>

        <div className="p-3 rounded-lg bg-obsidian-card border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-dim" />
            <span className="text-muted-body">Gateway Response:</span>
          </div>
          {isThrottled ? (
            <span className="text-alert-red font-bold flex items-center gap-1 bg-alert-red/10 px-2 py-0.5 rounded border border-alert-red/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              HTTP 429 (Retry-After: 60s)
            </span>
          ) : (
            <span className="text-acid font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              HTTP 200 OK (Within Window)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

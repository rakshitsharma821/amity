'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Plus,
  Server,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  ChevronDown,
  Terminal,
  ExternalLink,
  RefreshCw,
  Search,
  Database,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { createTargetSchema, type CreateTargetInput } from '@/lib/validation';
import { motion, AnimatePresence } from 'framer-motion';
import AmbientBackground from '@/components/cyber/ambient-background';
import SocBotModal from '@/components/cyber/soc-bot-modal';
import { useAuth } from '@/components/auth/auth-context';
import { createClient } from '@/lib/supabase/client';

interface Target {
  id: string;
  name: string;
  baseUrl: string;
  specUrl: string;
  verificationToken: string;
  verificationMethod: 'dns_txt' | 'well_known';
  isVerified: boolean;
  verifiedAt?: string;
  scansCount: number;
}

interface Finding {
  id: string;
  findingCode: string;
  title: string;
  vulnerabilityClass: string;
  severity: 'High' | 'Medium' | 'Low';
  endpoint: string;
  explanation: string;
  evidence: Record<string, unknown>;
  reproduction: string;
  recommendation: string;
  isExample?: boolean;
}

export default function DashboardPage() {
  const { user, openAuthModal } = useAuth();

  // Target state
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState(false);

  // Form states for new target
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetBaseUrl, setNewTargetBaseUrl] = useState('');
  const [newTargetSpecUrl, setNewTargetSpecUrl] = useState('');
  const [newTargetMethod, setNewTargetMethod] = useState<'dns_txt' | 'well_known'>('dns_txt');
  const [formError, setFormError] = useState<string | null>(null);

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scannerNotice, setScannerNotice] = useState<string | null>(null);

  // Credential inputs for active scan
  const [userAUsername, setUserAUsername] = useState('user_alpha_auditor');
  const [userAPassword, setUserAPassword] = useState('••••••••••••');
  const [userBUsername, setUserBUsername] = useState('user_beta_resource_owner');
  const [userBPassword, setUserBPassword] = useState('••••••••••••');

  // Filter & Search states
  const [severityFilter, setSeverityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [copiedCurlId, setCopiedCurlId] = useState<string | null>(null);

  // Live findings state
  const [findings, setFindings] = useState<Finding[]>([]);

  // Synchronize with Supabase Cloud Database for User Targets
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // 1. Fetch user targets from Supabase
    supabase
      .from('targets')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data: dbTargets, error }) => {
        if (!error && dbTargets && dbTargets.length > 0) {
          const mappedTargets: Target[] = dbTargets.map((t) => ({
            id: t.id,
            name: t.name,
            baseUrl: t.base_url,
            specUrl: t.spec_url || '',
            verificationToken: t.verification_token,
            verificationMethod: t.verification_method as 'dns_txt' | 'well_known',
            isVerified: t.is_verified,
            verifiedAt: t.verified_at ? new Date(t.verified_at).toLocaleDateString() : undefined,
            scansCount: 1,
          }));

          setTargets(mappedTargets);
          setSelectedTargetId((curr) => curr || mappedTargets[0].id);
        }
      });
  }, [user]);

  // 2. Fetch user findings specifically for currently selected target
  useEffect(() => {
    if (!selectedTargetId) {
      setFindings([]);
      return;
    }
    setScannerNotice(null);

    fetch(`/api/findings?targetId=${selectedTargetId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.findings) && data.findings.length > 0) {
          const mappedFindings: Finding[] = data.findings.map((f: {
            id: string;
            finding_code: string;
            title: string;
            vulnerability_class: string;
            severity: string;
            endpoint: string;
            explanation: string;
            evidence: Record<string, unknown> | string;
            reproduction: string;
            recommendation: string;
          }) => ({
            id: f.id,
            findingCode: f.finding_code,
            title: f.title,
            vulnerabilityClass: f.vulnerability_class,
            severity: (f.severity as 'High' | 'Medium' | 'Low') || 'Medium',
            endpoint: f.endpoint,
            explanation: f.explanation,
            evidence: (typeof f.evidence === 'string' ? JSON.parse(f.evidence) : f.evidence) || {},
            reproduction: f.reproduction,
            recommendation: f.recommendation,
            isExample: false,
          }));

          setFindings(mappedFindings);
        } else {
          setFindings([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load findings:', err);
        setFindings([]);
      });
  }, [selectedTargetId]);

  const selectedTarget = targets.find((t) => t.id === selectedTargetId) || targets[0];

  // Handlers
  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = createTargetSchema.safeParse({
      name: newTargetName,
      baseUrl: newTargetBaseUrl,
      specUrl: newTargetSpecUrl,
      verificationMethod: newTargetMethod,
    });

    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message || 'Please check your inputs.');
      return;
    }

    const token = `sentinel_verify_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

    if (user) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('targets')
          .insert({
            user_id: user.id,
            name: validation.data.name,
            base_url: validation.data.baseUrl,
            spec_url: validation.data.specUrl || null,
            verification_token: token,
            verification_method: validation.data.verificationMethod,
            is_verified: false,
          })
          .select()
          .single();

        if (error) {
          setFormError(`Supabase error: ${error.message}`);
          return;
        }

        if (data) {
          const created: Target = {
            id: data.id,
            name: data.name,
            baseUrl: data.base_url,
            specUrl: data.spec_url || '',
            verificationToken: data.verification_token,
            verificationMethod: data.verification_method as 'dns_txt' | 'well_known',
            isVerified: data.is_verified,
            scansCount: 0,
          };
          setTargets([created, ...targets]);
          setSelectedTargetId(created.id);
          setIsAddTargetModalOpen(false);
          setNewTargetName('');
          setNewTargetBaseUrl('');
          setNewTargetSpecUrl('');
          return;
        }
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Database error');
        return;
      }
    }

    const newTarget: Target = {
      id: `target-${Date.now()}`,
      name: validation.data.name,
      baseUrl: validation.data.baseUrl,
      specUrl: validation.data.specUrl || '',
      verificationToken: token,
      verificationMethod: validation.data.verificationMethod,
      isVerified: false,
      scansCount: 0,
    };

    setTargets([newTarget, ...targets]);
    setSelectedTargetId(newTarget.id);
    setIsAddTargetModalOpen(false);
    setNewTargetName('');
    setNewTargetBaseUrl('');
    setNewTargetSpecUrl('');
  };

  const handleVerifyDomain = async (asAttestation = false) => {
    if (!selectedTarget) return;
    setVerifying(true);
    setVerificationFeedback(null);

    try {
      const res = await fetch('/api/verify-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: selectedTarget.id,
          baseUrl: selectedTarget.baseUrl,
          verificationToken: selectedTarget.verificationToken,
          verificationMethod: asAttestation ? 'developer_attestation' : selectedTarget.verificationMethod,
          developerAttestation: asAttestation,
        }),
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setVerificationFeedback({ success: true, message: data.message });
        if (user) {
          const supabase = createClient();
          await supabase
            .from('targets')
            .update({
              is_verified: true,
              verified_at: new Date().toISOString(),
            })
            .eq('id', selectedTarget.id);
        }
        setTargets((prev) =>
          prev.map((t) =>
            t.id === selectedTarget.id
              ? { ...t, isVerified: true, verifiedAt: new Date().toLocaleDateString() }
              : t
          )
        );
      } else {
        setVerificationFeedback({
          success: false,
          message: data.error || 'Ownership verification failed. Please check your DNS or verification file.',
        });
      }
    } catch {
      setVerificationFeedback({
        success: false,
        message: 'Network error while attempting verification.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDispatchScan = async () => {
    if (!selectedTarget) return;
    setScanning(true);
    setScannerNotice(null);

    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: selectedTarget.id,
          targetName: selectedTarget.name,
          baseUrl: selectedTarget.baseUrl,
          specUrl: selectedTarget.specUrl,
          isVerified: selectedTarget.isVerified,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScannerNotice(data.error || 'Failed to dispatch vulnerability scan.');
      } else {
        setScannerNotice(data.message || `Audit completed. ${data.totalFindings} vulnerabilities discovered.`);
        if (Array.isArray(data.findings)) {
          const mapped: Finding[] = data.findings.map((f: {
            finding_code?: string;
            title?: string;
            vulnerability_class?: string;
            severity?: string;
            endpoint?: string;
            explanation?: string;
            evidence?: Record<string, unknown>;
            reproduction?: string;
            recommendation?: string;
          }, idx: number) => ({
            id: `finding-${Date.now()}-${idx}`,
            findingCode: f.finding_code || `SENTINEL-FIND-${idx + 1}`,
            title: f.title || 'Security Vulnerability',
            vulnerabilityClass: f.vulnerability_class || 'Security Flaw',
            severity: (f.severity as 'High' | 'Medium' | 'Low') || 'Medium',
            endpoint: f.endpoint || selectedTarget.baseUrl,
            explanation: f.explanation || '',
            evidence: f.evidence || {},
            reproduction: f.reproduction || '',
            recommendation: f.recommendation || '',
            isExample: false,
          }));
          setFindings(mapped);
        }
      }
    } catch (err: unknown) {
      setScannerNotice(
        `Scan failed: ${err instanceof Error ? err.message : 'Network error'}`
      );
    } finally {
      setScanning(false);
    }
  };

  const handleDeleteTarget = async (idToDelete: string) => {
    if (!confirm('Are you sure you want to delete this target and all its telemetry findings?')) return;
    try {
      const res = await fetch(`/api/targets?id=${idToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = targets.filter((t) => t.id !== idToDelete);
        setTargets(remaining);
        setSelectedTargetId(remaining[0]?.id || '');
        setFindings([]);
      }
    } catch (err) {
      console.error('Delete target error:', err);
    }
  };

  const copyCurl = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCurlId(id);
      setTimeout(() => setCopiedCurlId(null), 2000);
    });
  };

  // Filtered findings
  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== 'All' && f.severity !== severityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(query) ||
        f.endpoint.toLowerCase().includes(query) ||
        f.findingCode.toLowerCase().includes(query) ||
        f.vulnerabilityClass.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const highCount = findings.filter((f) => f.severity === 'High').length;
  const mediumCount = findings.filter((f) => f.severity === 'Medium').length;
  const lowCount = findings.filter((f) => f.severity === 'Low').length;

  return (
    <div className="relative pt-28 pb-20 max-w-7xl mx-auto px-6">
      <AmbientBackground />
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-muted-heading">Security Dashboard</h1>
            {user ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-acid/15 border border-acid/30 text-acid font-mono text-[11px] font-bold">
                <Database className="w-3 h-3" />
                <span>SUPABASE CONNECTED</span>
              </span>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-warn-amber/15 border border-warn-amber/30 text-amber-200 font-mono text-[11px] hover:bg-warn-amber/25 transition-colors"
              >
                <Database className="w-3 h-3 text-warn-amber" />
                <span>DEMO MODE &middot; Sign in to sync Supabase</span>
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-body">
            Manage target APIs, verify domain ownership, and audit authorization vulnerabilities.
          </p>
        </div>

        <button
          onClick={() => setIsAddTargetModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-acid hover:bg-acid-hover text-obsidian text-xs font-bold shadow-[0_2px_10px_rgba(163,230,53,0.25)] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Target API</span>
        </button>
      </div>

      {/* Target Selector & Verification Guardrail Card */}
      {targets.length === 0 ? (
        <div className="hud-frame glass-panel-elevated rounded-2xl p-10 border-white/15 text-center my-8">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-acid mx-auto mb-4">
            <Server className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Target APIs Registered</h3>
          <p className="text-xs sm:text-sm text-muted-body max-w-md mx-auto mb-6 leading-relaxed">
            Register your production or staging API endpoint to begin domain ownership verification and zero-trust vulnerability auditing.
          </p>
          <button
            onClick={() => setIsAddTargetModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-acid hover:bg-acid-hover text-obsidian text-xs font-bold shadow-[0_2px_12px_rgba(163,230,53,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Your First Target API</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Target Details Card */}
          <div className="lg:col-span-2 glass-panel-elevated rounded-2xl p-6 border-white/15">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase text-muted-dim font-bold">
                  Active Target:
                </span>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-obsidian border border-acid/50 text-acid text-xs font-mono font-bold outline-none focus:border-acid cursor-pointer shadow-[0_0_12px_rgba(163,230,53,0.15)] max-w-[280px] sm:max-w-none truncate"
                >
                  {targets.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#0a0a0b] text-white">
                      {t.name} — {t.baseUrl}
                    </option>
                  ))}
                </select>

                {selectedTarget && (
                  <button
                    onClick={() => handleDeleteTarget(selectedTarget.id)}
                    title="Delete this target and all its findings"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-alert-red/20 text-muted-dim hover:text-alert-red border border-white/10 hover:border-alert-red/30 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {selectedTarget?.isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-acid/15 text-acid border border-acid/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>OWNERSHIP VERIFIED</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-warn-amber/15 text-amber-300 border border-warn-amber/40">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>UNVERIFIED TARGET</span>
                </span>
              )}
            </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="text-muted-dim uppercase text-[11px] block">API Name:</span>
              <span className="text-white text-base font-sans font-bold">{selectedTarget?.name}</span>
            </div>
            <div>
              <span className="text-muted-dim uppercase text-[11px] block">Base URL:</span>
              <span className="text-acid">{selectedTarget?.baseUrl}</span>
            </div>
            <div>
              <span className="text-muted-dim uppercase text-[11px] block">OpenAPI Specification URL:</span>
              <span className="text-muted-body">{selectedTarget?.specUrl || 'Uploaded via JSON spec'}</span>
            </div>
          </div>

          {/* Ownership Verification Instruction (Strict Safety Mandate) */}
          {!selectedTarget?.isVerified && (
            <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-amber-200 text-xs font-semibold">
                <Lock className="w-4 h-4 text-warn-amber" />
                <span>Mandatory Domain Ownership Verification Required</span>
              </div>
              <p className="text-xs text-muted-body leading-relaxed">
                To prevent unauthorized testing of third-party systems, you must prove ownership of this domain before scanning:
              </p>

              {selectedTarget?.verificationMethod === 'dns_txt' ? (
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono space-y-1">
                  <div>
                    <span className="text-muted-dim">DNS Record Type:</span> TXT
                  </div>
                  <div>
                    <span className="text-muted-dim">Host / Name:</span> @ or _sentinelapi-verify
                  </div>
                  <div>
                    <span className="text-muted-dim">Value:</span>{' '}
                    <span className="text-white">{selectedTarget?.verificationToken}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono space-y-1">
                  <div>
                    <span className="text-muted-dim">Host static file at:</span>{' '}
                    <span className="text-white">
                      {selectedTarget?.baseUrl}/.well-known/sentinelapi-verify.txt
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-dim">Expected Content:</span>{' '}
                    <span className="text-white">{selectedTarget?.verificationToken}</span>
                  </div>
                </div>
              )}

              {verificationFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono ${
                    verificationFeedback.success
                      ? 'bg-acid/15 border border-acid/30 text-acid'
                      : 'bg-alert-red/15 border border-alert-red/35 text-red-200'
                  }`}
                >
                  {verificationFeedback.message}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  onClick={() => handleVerifyDomain(false)}
                  disabled={verifying}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                  <span>{verifying ? 'Verifying...' : 'Check Domain Ownership Now'}</span>
                </button>

                <button
                  onClick={() => handleVerifyDomain(true)}
                  disabled={verifying}
                  title="Certify developer ownership for testing Render/Vercel/Staging backends without deploying verification files"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-acid/15 hover:bg-acid/25 text-acid text-xs font-semibold border border-acid/30 transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Instant Authorize (Developer Attestation)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scan Dispatch Action Card */}
        <div className="glass-panel-elevated rounded-2xl p-6 border-white/15 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-muted-dim font-bold block mb-4">
              Execute Zero-Trust Audit
            </span>

            <div className="space-y-3 mb-6">
              <div className="text-xs font-mono text-muted-dim">
                <span>Dual-User Session Contexts:</span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/10 text-xs font-mono space-y-1">
                <div>
                  <span className="text-acid font-bold">User A (Attacker):</span> {userAUsername}
                </div>
                <div>
                  <span className="text-muted-body font-bold">User B (Owner):</span> {userBUsername}
                </div>
              </div>
              <p className="text-[11px] text-muted-dim leading-relaxed">
                Credentials are encrypted ephemerally during active scans and never logged.
              </p>
            </div>
          </div>

          <div>
            {scannerNotice && (
              <div className="p-3 mb-4 rounded-lg bg-warn-amber/15 border border-warn-amber/30 text-amber-200 text-xs font-mono leading-relaxed">
                {scannerNotice}
              </div>
            )}

            <button
              onClick={handleDispatchScan}
              disabled={scanning || !selectedTarget?.isVerified}
              className="w-full py-3 rounded-lg bg-acid hover:bg-acid-hover text-obsidian font-bold text-xs shadow-[0_2px_12px_rgba(163,230,53,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{scanning ? 'Dispatching Scan...' : 'Launch Authorization Audit'}</span>
            </button>

            {!selectedTarget?.isVerified && (
              <span className="text-[11px] text-alert-red font-mono block text-center mt-2">
                Verify domain ownership before launching scan.
              </span>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel rounded-xl p-5 border-white/10">
          <div className="text-xs font-mono uppercase text-muted-dim mb-1">Total Findings</div>
          <div className="text-3xl font-bold text-white">{findings.length}</div>
        </div>
        <div className="glass-panel rounded-xl p-5 border-alert-red/30 bg-alert-red/5">
          <div className="text-xs font-mono uppercase text-alert-red mb-1 font-bold">High Severity</div>
          <div className="text-3xl font-bold text-red-200">{highCount}</div>
        </div>
        <div className="glass-panel rounded-xl p-5 border-warn-amber/30 bg-warn-amber/5">
          <div className="text-xs font-mono uppercase text-warn-amber mb-1 font-bold">Medium Severity</div>
          <div className="text-3xl font-bold text-amber-200">{mediumCount}</div>
        </div>
        <div className="glass-panel rounded-xl p-5 border-white/10">
          <div className="text-xs font-mono uppercase text-muted-dim mb-1">CI/CD Gate</div>
          {findings.length === 0 ? (
            <div className="text-sm font-bold text-muted-dim font-mono mt-2">
              {selectedTarget?.isVerified ? 'PENDING AUDIT' : 'UNVERIFIED'}
            </div>
          ) : highCount > 0 ? (
            <div className="text-sm font-bold text-alert-red font-mono mt-2">BLOCKED (HIGH RISK)</div>
          ) : mediumCount > 0 ? (
            <div className="text-sm font-bold text-warn-amber font-mono mt-2">WARNING (MED RISK)</div>
          ) : (
            <div className="text-sm font-bold text-acid font-mono mt-2">PASSED (SECURE)</div>
          )}
        </div>
      </div>

      {/* Filterable Findings List */}
      <div className="glass-panel-elevated rounded-2xl p-6 sm:p-8 border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
          <div>
            <h2 className="text-xl font-bold text-muted-heading">Audit Findings</h2>
            <p className="text-xs text-muted-body">
              Severity-ranked flaws discovered on current verified target.
            </p>
          </div>

          {/* Severity Tabs & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex p-1 rounded-lg bg-black/40 border border-white/10 text-xs font-mono">
              {(['All', 'High', 'Medium', 'Low'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 rounded transition-colors ${
                    severityFilter === sev
                      ? 'bg-acid text-obsidian font-bold'
                      : 'text-muted-body hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-dim" />
              <input
                type="text"
                placeholder="Search findings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder:text-muted-dim outline-none focus:border-acid"
              />
            </div>
          </div>
        </div>

        {/* Findings Accordion List */}
        <div className="space-y-4">
          {filteredFindings.length === 0 ? (
            <div className="p-8 text-center text-muted-dim font-mono text-xs border border-dashed border-white/10 rounded-xl">
              &gt; NO FINDINGS RECORDED // Target has not been scanned yet or zero vulnerabilities were flagged.
            </div>
          ) : (
            filteredFindings.map((f) => {
            const isExpanded = expandedFindingId === f.id;
            return (
              <div
                key={f.id}
                className="rounded-xl border border-white/10 bg-[#111114] overflow-hidden transition-all"
              >
                <div
                  onClick={() => setExpandedFindingId(isExpanded ? null : f.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase border ${
                        f.severity === 'High'
                          ? 'bg-alert-red/20 text-red-200 border-alert-red/40'
                          : 'bg-warn-amber/20 text-amber-200 border-warn-amber/40'
                      }`}
                    >
                      {f.severity}
                    </span>

                    {f.isExample && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-muted-dim bg-white/5 border border-white/10">
                        EXAMPLE FINDING
                      </span>
                    )}

                    <span className="font-mono text-xs text-acid font-bold">{f.findingCode}</span>
                    <span className="text-white text-sm font-semibold">{f.title}</span>
                    <span className="font-mono text-xs text-muted-dim">({f.endpoint})</span>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-muted-dim transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-acid' : ''
                    }`}
                  />
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 border-t border-white/10 bg-black/30 space-y-5 text-xs sm:text-sm">
                        <div>
                          <h4 className="text-xs font-mono uppercase text-muted-dim font-bold mb-1.5">
                            Plain-English Explanation (Risk Impact)
                          </h4>
                          <p className="text-muted-heading leading-relaxed">{f.explanation}</p>
                        </div>

                        <div>
                          <h4 className="text-xs font-mono uppercase text-muted-dim font-bold mb-1.5">
                            Sanitized Evidence Payload
                          </h4>
                          <div className="p-3.5 rounded-lg bg-black/60 border border-white/10 font-mono text-xs text-muted-heading overflow-x-auto">
                            <pre>{JSON.stringify(f.evidence, null, 2)}</pre>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="text-xs font-mono uppercase text-muted-dim font-bold">
                              Runnable Reproduction Command (cURL)
                            </h4>
                            <button
                              onClick={() => copyCurl(f.reproduction, f.id)}
                              className="inline-flex items-center gap-1 text-xs text-acid hover:underline font-mono"
                            >
                              {copiedCurlId === f.id ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedCurlId === f.id ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                          <div className="p-3.5 rounded-lg bg-black/60 border border-white/10 font-mono text-xs text-white overflow-x-auto">
                            <code>{f.reproduction}</code>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-acid/5 border border-acid/25 text-lime-200 text-xs sm:text-sm">
                          <strong className="text-acid">Concrete Engineering Remediation:</strong>{' '}
                          {f.recommendation}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Add Target Modal */}
      <AnimatePresence>
        {isAddTargetModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-lg p-7 rounded-2xl bg-obsidian-card border border-white/15 shadow-2xl hud-frame"
            >
              <h2 className="text-xl font-bold text-white mb-2">Register New Target API</h2>
              <p className="text-xs text-muted-body mb-6">
                Enter target details. Domain ownership verification will be required before scans.
              </p>

              {formError && (
                <div className="p-3 mb-4 rounded-lg bg-alert-red/15 border border-alert-red/35 text-red-200 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddTarget} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-muted-dim mb-1 font-bold">
                    API Identifier Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Billing Gateway Service"
                    value={newTargetName}
                    onChange={(e) => setNewTargetName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-obsidian border border-white/15 text-white text-xs outline-none focus:border-acid"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-muted-dim mb-1 font-bold">
                    Base API URL (http:// or https://)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://api.yourdomain.com"
                    value={newTargetBaseUrl}
                    onChange={(e) => setNewTargetBaseUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-obsidian border border-white/15 text-white text-xs outline-none focus:border-acid font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-muted-dim mb-1 font-bold">
                    OpenAPI Spec URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.yourdomain.com/openapi.json"
                    value={newTargetSpecUrl}
                    onChange={(e) => setNewTargetSpecUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-obsidian border border-white/15 text-white text-xs outline-none focus:border-acid font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-muted-dim mb-1 font-bold">
                    Domain Verification Method
                  </label>
                  <select
                    value={newTargetMethod}
                    onChange={(e) => setNewTargetMethod(e.target.value as 'dns_txt' | 'well_known')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-obsidian border border-white/15 text-white text-xs outline-none focus:border-acid"
                  >
                    <option value="dns_txt">DNS TXT Record (Recommended for production domains)</option>
                    <option value="well_known">HTTP /.well-known File (Fastest for static hosts)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddTargetModalOpen(false)}
                    className="px-4 py-2 text-xs text-muted-body hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-acid hover:bg-acid-hover text-obsidian font-bold text-xs"
                  >
                    Create Target
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating SOC AI Security Copilot Bot */}
      <SocBotModal target={selectedTarget} findings={findings} />
    </div>
  );
}

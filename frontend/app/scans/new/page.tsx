'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LoaderCircle, ShieldCheck, Globe, Key, Shield, Layers, Sliders } from 'lucide-react';
import AmbientBackground from '@/components/cyber/ambient-background';
import { startScan } from '@/lib/api/scans';
import { getTargetSummary, listTargets, registerSandboxTarget } from '@/lib/api/targets';
import type { OpenApiSummary, ScanChecks, Target } from '@/lib/api/types';

const inputClass = 'mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-lime-400 focus:bg-black/60';

const initialChecks: ScanChecks = { 
  bola: true, 
  bfla: true, 
  dataExposure: true, 
  massAssignment: true, 
  rateLimiting: true, 
  rateLimitRequests: 5 
};

export default function NewScanPage() {
  const router = useRouter();
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<OpenApiSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [checks, setChecks] = useState<ScanChecks>(initialChecks);

  // Dynamic Target Configuration (defaults to new custom target)
  const [targetMode, setTargetMode] = useState<'new' | 'existing'>('new');
  const [customName, setCustomName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [openApiUrl, setOpenApiUrl] = useState('');

  // Identity Mode: 'auto' (zero-config dynamic test tokens) vs 'custom'
  const [identityMode, setIdentityMode] = useState<'auto' | 'custom'>('auto');

  // Dynamic Test Identity 1 (Primary / Probe Context)
  const [user1Username, setUser1Username] = useState('');
  const [user1Password, setUser1Password] = useState('');
  const [user1Role, setUser1Role] = useState('');
  const [user1ResourceIds, setUser1ResourceIds] = useState('');

  // Dynamic Test Identity 2 (Target / Peer Context)
  const [user2Username, setUser2Username] = useState('');
  const [user2Password, setUser2Password] = useState('');
  const [user2Role, setUser2Role] = useState('');
  const [user2ResourceIds, setUser2ResourceIds] = useState('');

  // Load existing targets if any exist
  useEffect(() => {
    let active = true;
    listTargets()
      .then((items) => {
        if (!active) return;
        setTargets(items);
        if (items.length > 0) {
          setTargetId(items[0].id);
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to connect to target service.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const selected = useMemo(() => targets.find((t) => t.id === targetId), [targets, targetId]);

  useEffect(() => {
    if (!selected || targetMode !== 'existing') {
      setSummary(null);
      setSummaryError('');
      return;
    }
    let active = true;
    setSummary(null);
    setSummaryError('');
    void getTargetSummary(selected.id)
      .then((val) => {
        if (active) setSummary(val);
      })
      .catch((reason) => {
        if (active) setSummaryError(reason instanceof Error ? reason.message : 'OpenAPI inspection unavailable');
      });
    return () => { active = false; };
  }, [selected, targetMode]);

  const handleRegisterAndScan = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      let activeTargetId = targetId;

      // Register custom target if new mode is selected
      if (targetMode === 'new') {
        const cleanBase = baseUrl.trim().replace(/\/+$/, '');
        if (!cleanBase) {
          throw new Error('Please specify a valid Target API Base URL.');
        }

        const newTarget = await registerSandboxTarget(
          customName.trim() || 'Custom Tested API',
          cleanBase,
          openApiUrl.trim() || `${cleanBase}/openapi.json`
        );
        activeTargetId = newTarget.id;
        setTargets((prev) => [newTarget, ...prev]);
        setTargetId(newTarget.id);
      }

      if (!activeTargetId) {
        throw new Error('Please enter or select an API target to scan.');
      }

      // Parse user-specified resource IDs or use empty arrays
      const user1Orders = user1ResourceIds.split(',').map((s) => s.trim()).filter(Boolean);
      const user2Orders = user2ResourceIds.split(',').map((s) => s.trim()).filter(Boolean);

      const dynamicIdentities = [
        {
          id: 'actor_1',
          username: user1Username.trim() || 'primary_caller',
          role: user1Role.trim() || 'user',
          credentials: {
            username: user1Username.trim() || 'primary_caller',
            password: user1Password.trim() || 'auto_token_1',
          },
          ownedResources: {
            order: user1Orders.length ? user1Orders : ['101', '102'],
            user: ['1'],
          },
        },
        {
          id: 'actor_2',
          username: user2Username.trim() || 'target_peer',
          role: user2Role.trim() || 'user',
          credentials: {
            username: user2Username.trim() || 'target_peer',
            password: user2Password.trim() || 'auto_token_2',
          },
          ownedResources: {
            order: user2Orders.length ? user2Orders : ['201', '202'],
            user: ['2'],
          },
        },
      ];

      const result = await startScan(activeTargetId, dynamicIdentities, checks);
      router.push(`/scans/${result.scanId}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not initialize scan.');
      setBusy(false);
    }
  };

  const moduleList: Array<[Exclude<keyof ScanChecks, 'rateLimitRequests'>, string, string]> = [
    ['bola', 'BOLA / IDOR Verification', 'Tests cross-tenant object access by querying target tenant resources using primary caller token.'],
    ['dataExposure', 'Excessive Data Exposure', 'Scans response payloads for unmasked payment card numbers (PCI-DSS PAN), credentials, and PII.'],
    ['rateLimiting', 'Rate Limiting & Throttling', 'Sends bounded request bursts to authentication endpoints to detect missing 429 throttling controls.'],
    ['bfla', 'Broken Function Level Auth (BFLA)', 'Attempts administrative role mutations and permission escalations from standard user sessions.'],
    ['massAssignment', 'Mass Assignment Testing', 'Probes model mutation endpoints for unauthorized injection of internal server properties.'],
  ];

  return (
    <main className="relative min-h-screen overflow-hidden px-5 pb-24 pt-28 sm:px-8">
      <AmbientBackground />
      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Navigation Breadcrumb */}
        <Link 
          href="/dashboard" 
          className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Operations Dashboard
        </Link>

        {/* Title Header */}
        <div className="mb-7">
          <p className="font-mono text-xs uppercase tracking-[.25em] text-lime-400">Zero-Trust Security Assessment</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Configure a Security Scan</h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Enter your target API endpoint, choose security checks, and execute a dynamic vulnerability assessment.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleRegisterAndScan(e)} className="grid gap-6">
          {/* SECTION 1: Target API */}
          <section className="rounded-2xl border border-white/10 bg-[#111114]/90 p-6 backdrop-blur-md">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-lime-400" />
                <h2 className="font-bold text-white text-base">1 · API Target Definition</h2>
              </div>

              {/* Target Mode Toggle */}
              <div className="flex rounded-lg border border-white/10 bg-black/40 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTargetMode('new')}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    targetMode === 'new' ? 'bg-lime-400 text-black font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Custom Target API
                </button>
                {targets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTargetMode('existing')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      targetMode === 'existing' ? 'bg-lime-400 text-black font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Saved Targets ({targets.length})
                  </button>
                )}
              </div>
            </div>

            {targetMode === 'new' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs text-zinc-400">
                  Target Display Name
                  <input
                    required
                    type="text"
                    placeholder="e.g. Production API Gateway"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block text-xs text-zinc-400">
                  Target Base API URL
                  <input
                    required
                    type="url"
                    placeholder="e.g. https://api.yourdomain.com"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block text-xs text-zinc-400 sm:col-span-2">
                  OpenAPI 3.0 / Swagger JSON URL (Optional)
                  <input
                    type="url"
                    placeholder="e.g. https://api.yourdomain.com/openapi.json (defaults to /openapi.json)"
                    value={openApiUrl}
                    onChange={(e) => setOpenApiUrl(e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                  Choose Saved Target
                </label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className={inputClass}
                >
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.baseUrl})
                    </option>
                  ))}
                </select>

                {selected && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-2 text-xs text-lime-300 font-mono mb-2">
                      <ShieldCheck size={15} />
                      Target Mode: {selected.sandboxMode ? 'Sandbox Mode' : 'Production API'}
                    </div>
                    <div className="grid gap-1 font-mono text-xs">
                      <p className="text-zinc-300"><span className="text-zinc-500">Base URL:</span> {selected.baseUrl}</p>
                      <p className="text-zinc-300"><span className="text-zinc-500">OpenAPI:</span> {selected.openApiUrl}</p>
                    </div>

                    {summary && (
                      <div className="mt-3 pt-3 border-t border-white/10 text-xs">
                        <p className="text-white font-medium">{summary.title} · OpenAPI {summary.version}</p>
                        <p className="text-zinc-400 mt-0.5">{summary.endpointCount} endpoints discovered · {summary.resourceCount} entities</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SECTION 2: Test Identities */}
          <section className="rounded-2xl border border-white/10 bg-[#111114]/90 p-6 backdrop-blur-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-lime-400" />
                <div>
                  <h2 className="font-bold text-white text-base">2 · Test Identities & Authorization Context</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Configure caller credentials to test cross-tenant object ownership boundaries.
                  </p>
                </div>
              </div>

              {/* Identity Mode Toggle */}
              <div className="flex rounded-lg border border-white/10 bg-black/40 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setIdentityMode('auto')}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    identityMode === 'auto' ? 'bg-lime-400 text-black font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Automated (Zero Config)
                </button>
                <button
                  type="button"
                  onClick={() => setIdentityMode('custom')}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    identityMode === 'custom' ? 'bg-lime-400 text-black font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Custom Credentials
                </button>
              </div>
            </div>

            {identityMode === 'auto' ? (
              <div className="rounded-xl border border-lime-400/20 bg-lime-950/15 p-4 text-xs">
                <div className="flex items-center gap-2 text-lime-400 font-mono font-semibold mb-1">
                  <ShieldCheck size={16} /> Automated Dynamic Sessions Active
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  The scanner will automatically generate isolated test session tokens and probe cross-tenant boundaries without requiring manual credential entry.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Identity 1: Primary Context */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-lime-300 uppercase">Actor 1 (Primary Caller Context)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-lime-400/10 text-lime-300">Identity A</span>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs text-zinc-400">
                      Username / Client ID
                      <input
                        type="text"
                        placeholder="e.g. test_user_primary"
                        value={user1Username}
                        onChange={(e) => setUser1Username(e.target.value)}
                        className={inputClass}
                      />
                    </label>

                    <label className="block text-xs text-zinc-400">
                      Password / Secret Token
                      <input
                        type="password"
                        placeholder="Token secret or password"
                        value={user1Password}
                        onChange={(e) => setUser1Password(e.target.value)}
                        className={inputClass}
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs text-zinc-400">
                        Assigned Role
                        <input
                          type="text"
                          placeholder="e.g. standard_user"
                          value={user1Role}
                          onChange={(e) => setUser1Role(e.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className="block text-xs text-zinc-400">
                        Owned Resource IDs
                        <input
                          type="text"
                          placeholder="e.g. 101, 102"
                          value={user1ResourceIds}
                          onChange={(e) => setUser1ResourceIds(e.target.value)}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Identity 2: Peer Context */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase">Actor 2 (Target / Peer Context)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300">Identity B</span>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs text-zinc-400">
                      Username / Client ID
                      <input
                        type="text"
                        placeholder="e.g. test_user_secondary"
                        value={user2Username}
                        onChange={(e) => setUser2Username(e.target.value)}
                        className={inputClass}
                      />
                    </label>

                    <label className="block text-xs text-zinc-400">
                      Password / Secret Token
                      <input
                        type="password"
                        placeholder="Token secret or password"
                        value={user2Password}
                        onChange={(e) => setUser2Password(e.target.value)}
                        className={inputClass}
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs text-zinc-400">
                        Assigned Role
                        <input
                          type="text"
                          placeholder="e.g. standard_user"
                          value={user2Role}
                          onChange={(e) => setUser2Role(e.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className="block text-xs text-zinc-400">
                        Owned Resource IDs
                        <input
                          type="text"
                          placeholder="e.g. 201, 202"
                          value={user2ResourceIds}
                          onChange={(e) => setUser2ResourceIds(e.target.value)}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: Vulnerability Checks */}
          <section className="rounded-2xl border border-white/10 bg-[#111114]/90 p-6 backdrop-blur-md">
            <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-4">
              <Shield className="w-4 h-4 text-lime-400" />
              <div>
                <h2 className="font-bold text-white text-base">3 · Security Probes & Vulnerability Checks</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select which zero-trust checks to execute against discovered endpoints.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {moduleList.map(([key, name, desc]) => {
                const active = checks[key];
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                      active
                        ? 'border-lime-400/40 bg-lime-950/15'
                        : 'border-white/10 bg-black/20 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setChecks((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded accent-lime-400"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">{name}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs text-zinc-500 font-mono">
              Scans operate on non-destructive principles adhering to OpenAPI specifications.
            </p>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-lime-400 px-6 py-3 font-mono text-sm font-bold text-black hover:bg-lime-300 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)]"
            >
              {busy ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Initializing Scan...
                </>
              ) : (
                'Initialize Security Scan'
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

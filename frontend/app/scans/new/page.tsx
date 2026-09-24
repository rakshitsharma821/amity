'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react';
import AmbientBackground from '@/components/cyber/ambient-background';
import { startScan } from '@/lib/api/scans';
import { DEMO_IDENTITIES, getTargetSummary, listTargets, registerDemoTarget, registerSandboxTarget } from '@/lib/api/targets';
import type { OpenApiSummary, ScanChecks, Target } from '@/lib/api/types';

const inputClass = 'mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-300';
const initialChecks: ScanChecks = { bola: true, bfla: true, dataExposure: true, massAssignment: true, rateLimiting: true, rateLimitRequests: 5 };

export default function NewScanPage() {
  const router = useRouter();
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<OpenApiSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [checks, setChecks] = useState(initialChecks);
  const [alicePassword, setAlicePassword] = useState('alice123');
  const [bobPassword, setBobPassword] = useState('bob123');
  const [customName, setCustomName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [openApiUrl, setOpenApiUrl] = useState('');
  const [user, setUser] = useState('attacker');
  const [userPassword, setUserPassword] = useState('');
  const [victim, setVictim] = useState('victim');
  const [victimPassword, setVictimPassword] = useState('');
  const [attackerObjectIds, setAttackerObjectIds] = useState('1, 2');
  const [victimObjectIds, setVictimObjectIds] = useState('3, 4');

  useEffect(() => { listTargets().then((items) => { setTargets(items); setTargetId(items[0]?.id ?? ''); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load targets.')).finally(() => setLoading(false)); }, []);
  const selected = useMemo(() => targets.find((target) => target.id === targetId), [targets, targetId]);
  const isDemo = Boolean(selected?.demoSandbox);
  useEffect(() => {
    if (!selected) { setSummary(null); setSummaryError(''); return; }
    let active = true; setSummary(null); setSummaryError('');
    void getTargetSummary(selected.id).then((value) => { if (active) setSummary(value); }).catch((reason) => { if (active) setSummaryError(reason instanceof Error ? reason.message : 'Unable to inspect OpenAPI.'); });
    return () => { active = false; };
  }, [selected]);

  const addDemo = async () => {
    setBusy(true); setError('');
    try { const target = await registerDemoTarget(); setTargets((current) => [target, ...current]); setTargetId(target.id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Demo target registration failed.'); }
    finally { setBusy(false); }
  };

  const addCustom = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const target = await registerSandboxTarget(customName, baseUrl, openApiUrl || new URL('/openapi.json', baseUrl).toString()); setTargets((current) => [target, ...current]); setTargetId(target.id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Target registration failed.'); }
    finally { setBusy(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError('');
    try {
      const identities = isDemo
        ? DEMO_IDENTITIES.map((identity, index) => ({ ...identity, credentials: { username: identity.username, password: index === 0 ? alicePassword : bobPassword } }))
        : [
            { id: 'attacker', username: user, role: 'user', credentials: { username: user, password: userPassword }, ownedResources: { order: attackerObjectIds.split(',').map((item) => item.trim()).filter(Boolean), user: ['1'] } },
            { id: 'victim', username: victim, role: 'user', credentials: { username: victim, password: victimPassword }, ownedResources: { order: victimObjectIds.split(',').map((item) => item.trim()).filter(Boolean), user: ['2'] } },
          ];
      const chosen = { ...checks, bfla: checks.bfla && selected.sandboxMode && selected.allowDestructiveTests, massAssignment: checks.massAssignment && selected.sandboxMode && selected.allowDestructiveTests };
      const result = await startScan(selected.id, identities, chosen);
      router.push(`/scans/${result.scanId}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create scan.'); setBusy(false); }
  };

  const moduleList: Array<[Exclude<keyof ScanChecks, 'rateLimitRequests'>, string, string]> = [
    ['bola', 'BOLA', 'Cross-identity access checks against only the object IDs you configure.'],
    ['bfla', 'BFLA', 'Sandbox-gated role/action authorization probe; may change demo state.'],
    ['dataExposure', 'Excessive data exposure', 'Checks actual response fields against sensitive field names.'],
    ['massAssignment', 'Mass assignment', 'Sandbox-gated protected-field mutation followed by a state read.'],
    ['rateLimiting', 'Rate limit check', 'Small, bounded invalid-login request sample (maximum 10).'],
  ];

  return <main className="relative min-h-screen overflow-hidden px-5 pb-20 pt-28 sm:px-8"><AmbientBackground/><div className="relative z-10 mx-auto max-w-4xl"><Link href="/dashboard" className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/>Operations dashboard</Link><p className="font-mono text-xs uppercase tracking-[.25em] text-lime-300">Authorized testing workflow</p><h1 className="mt-2 text-4xl font-bold text-white">Configure a scan</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Select a registered API, provide two test identities for this scan, and choose supported checks. Credentials are not saved in the browser or registered target.</p>
    {error && <div role="alert" className="mt-6 rounded-xl border border-rose-400/30 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div>}
    <div className="mt-7 grid gap-6">
      <section className="rounded-2xl border border-white/10 bg-[#111113]/85 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-white">1 · API target</h2><button onClick={() => void addDemo()} disabled={busy} className="rounded-lg border border-lime-300/40 px-3 py-2 text-xs font-semibold text-lime-200 disabled:opacity-50">{busy ? 'Working…' : '+ Register Demo Commerce API'}</button></div><label className="block text-xs text-zinc-400">Select target<select value={targetId} onChange={(event) => setTargetId(event.target.value)} className={inputClass}><option value="">Select a backend target</option>{targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></label>{loading && <p className="mt-2 text-xs text-zinc-500">Loading registered targets…</p>}{selected && <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"><div className="mb-2 flex items-center gap-2 text-xs text-lime-200"><ShieldCheck size={15}/>{isDemo ? 'SAFE SANDBOX MODE · destructive probes reset the loopback fixture' : selected.authorized ? 'Target marked authorized; backend hostname allowlist still applies' : 'Local sandbox'}</div><p className="break-all font-mono text-xs text-zinc-300">API: {selected.baseUrl}</p><p className="mt-1 break-all font-mono text-xs text-zinc-500">OpenAPI: {selected.openApiUrl}</p>{summaryError && <p role="alert" className="mt-3 text-xs text-amber-200">OpenAPI summary unavailable: {summaryError}</p>}{summary && <div className="mt-4 border-t border-white/10 pt-3"><p className="text-sm font-medium text-white">{summary.title} · OpenAPI {summary.version}</p><p className="mt-1 text-xs text-zinc-400">{summary.endpointCount} endpoints · {summary.resourceCount} resources · {summary.relationshipCount} relationships</p><ul className="mt-3 grid max-h-36 gap-1 overflow-auto sm:grid-cols-2">{summary.endpoints.slice(0, 8).map((endpoint) => <li key={endpoint.id} className="font-mono text-[10px] text-zinc-400">{endpoint.method} {endpoint.path}</li>)}</ul></div>}</div>}
      <details className="mt-4 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm text-zinc-300">Register a custom authorized sandbox</summary><form onSubmit={(event) => void addCustom(event)} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs text-zinc-400">Target name<input required minLength={2} value={customName} onChange={(e) => setCustomName(e.target.value)} className={inputClass}/></label><label className="text-xs text-zinc-400">Base API URL<input required type="url" placeholder="https://sandbox.example.test" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={inputClass}/></label><label className="text-xs text-zinc-400 sm:col-span-2">OpenAPI URL<input type="url" placeholder="Same origin /openapi.json" value={openApiUrl} onChange={(e) => setOpenApiUrl(e.target.value)} className={inputClass}/></label><p className="text-xs text-amber-200 sm:col-span-2">Remote scans require the backend operator to allowlist the exact hostname. This form does not bypass that policy.</p><button disabled={busy} className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white sm:col-span-2 sm:justify-self-start">Register target</button></form></details></section>

      <form onSubmit={(event) => void submit(event)} className="grid gap-6"><section className="rounded-2xl border border-white/10 bg-[#111113]/85 p-5"><h2 className="mb-1 font-semibold text-white">2 · Test identities</h2><p className="mb-4 text-xs text-zinc-500">Use credentials explicitly authorized for this sandbox. Values stay in this page’s memory and are sent only with the scan request.</p><div className="grid gap-4 md:grid-cols-2">{(isDemo ? [{ name: 'Alice · attacker identity', username: 'alice', password: alicePassword, setUsername: undefined, setPassword: setAlicePassword }, { name: 'Bob · victim identity', username: 'bob', password: bobPassword, setUsername: undefined, setPassword: setBobPassword }] : [{ name: 'Attacker identity', username: user, password: userPassword, setUsername: setUser, setPassword: setUserPassword }, { name: 'Victim identity', username: victim, password: victimPassword, setUsername: setVictim, setPassword: setVictimPassword }]).map((identity) => <div key={identity.name} className="rounded-xl border border-white/10 p-4"><h3 className="mb-3 text-sm font-medium text-white">{identity.name}</h3><label className="block text-xs text-zinc-400">Username<input required autoComplete="off" readOnly={!identity.setUsername} value={identity.username} onChange={(e) => identity.setUsername?.(e.target.value)} className={`${inputClass} ${!identity.setUsername ? 'opacity-75' : ''}`}/></label><label className="mt-3 block text-xs text-zinc-400">Password<input required type="password" autoComplete="new-password" value={identity.password} onChange={(e) => identity.setPassword(e.target.value)} className={inputClass}/></label></div>)}</div>{!isDemo && <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs text-zinc-400">Attacker owned order IDs (comma separated)<input value={attackerObjectIds} onChange={(e) => setAttackerObjectIds(e.target.value)} className={inputClass}/></label><label className="text-xs text-zinc-400">Victim owned order IDs (comma separated)<input value={victimObjectIds} onChange={(e) => setVictimObjectIds(e.target.value)} className={inputClass}/></label></div>}</section>

      <section className="rounded-2xl border border-white/10 bg-[#111113]/85 p-5"><h2 className="mb-1 font-semibold text-white">3 · Security modules</h2><p className="mb-4 text-xs text-zinc-500">The selections are passed to the scanner; mutating probes run only when the registered target is an explicitly enabled sandbox.</p><div className="grid gap-3 sm:grid-cols-2">{moduleList.map(([key, name, description]) => { const gated = (key === 'bfla' || key === 'massAssignment') && (!selected?.sandboxMode || !selected.allowDestructiveTests); return <label key={key} className={`flex gap-3 rounded-xl border border-white/10 p-4 ${gated ? 'opacity-50' : 'cursor-pointer hover:border-lime-300/30'}`}><input type="checkbox" checked={checks[key]} disabled={gated} onChange={(e) => setChecks((current) => ({ ...current, [key]: e.target.checked }))} className="mt-1 accent-lime-300"/><span><span className="block text-sm font-medium text-white">{name}{gated && <small className="ml-2 text-zinc-500">sandbox only</small>}</span><span className="mt-1 block text-xs leading-5 text-zinc-500">{description}</span></span></label>; })}</div>{checks.rateLimiting && <label className="mt-4 block max-w-xs text-xs text-zinc-400">Invalid login requests (1–10)<input type="number" min={1} max={10} value={checks.rateLimitRequests} onChange={(e) => setChecks((current) => ({ ...current, rateLimitRequests: Math.max(1, Math.min(10, Number(e.target.value))) }))} className={inputClass}/></label>}</section>

      <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-xs text-zinc-500">Only scan APIs you own or have permission to test. The backend enforces target loopback and hostname allowlist rules.</p><button type="submit" disabled={!selected || busy || (!isDemo && (!userPassword || !victimPassword))} className="inline-flex items-center gap-2 rounded-lg bg-lime-300 px-5 py-3 text-sm font-bold text-black hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50">{busy && <LoaderCircle size={16} className="animate-spin"/>}Run Security Scan</button></div></form>
    </div></div></main>;
}

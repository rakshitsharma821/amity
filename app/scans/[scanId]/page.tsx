'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, CircleCheck, CircleDashed, CircleDot, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react';
import AmbientBackground from '@/components/cyber/ambient-background';
import { AuthorizationGraph } from '@/components/scans/authorization-graph';
import { getScan, scanStatus } from '@/lib/api/scans';
import type { Scan, ScanStatusResponse } from '@/lib/api/types';

const stages: Array<[ScanStatusResponse['status'] | 'CREATED', string]> = [['PARSING', 'Parse OpenAPI specification'], ['DISCOVERING', 'Discover endpoints'], ['MODELING', 'Model resources and authorization relationships'], ['GENERATING_TESTS', 'Prepare controlled security checks'], ['EXECUTING', 'Execute authorized sandbox probes'], ['VALIDATING', 'Validate returned data and ownership'], ['BUILDING_GRAPH', 'Build authorization graph and attack paths'], ['ANALYZING_IMPACT', 'Calculate contextual impact'], ['COMPLETED', 'Complete scan report']];
const panel = 'rounded-2xl border border-white/10 bg-[#111113]/85 p-5';

export default function ScanPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [status, setStatus] = useState<ScanStatusResponse | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const current = await scanStatus(scanId);
        if (!active) return;
        setStatus(current); setError('');
        if (current.status === 'COMPLETED' || current.status === 'FAILED') {
          const full = await getScan(scanId);
          if (active) setScan(full);
          return;
        }
        if (Date.now() - started > 120000) { setError('This scan is still active after two minutes. Its backend state is retained; retry loading to continue watching.'); return; }
        timer = setTimeout(() => void poll(), 900);
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Unable to read scan status.'); }
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [scanId, retry]);

  const activeStage = status?.status === 'CREATED' ? -1 : stages.findIndex(([key]) => key === status?.status);
  const done = status?.status === 'COMPLETED';
  return <main className="relative min-h-screen overflow-hidden px-5 pb-20 pt-28 sm:px-8"><AmbientBackground/><div className="relative z-10 mx-auto max-w-7xl"><Link href="/dashboard" className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/>Dashboard</Link>
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono text-xs uppercase tracking-[.25em] text-lime-300">{done ? 'Scan results' : 'Live backend scan'}</p><h1 className="mt-2 text-3xl font-bold text-white">{done ? 'Authorization intelligence report' : 'Security scan in progress'}</h1><p className="mt-2 font-mono text-xs text-zinc-500">Scan ID · {scanId}</p></div><div className="flex gap-2"><Link href={`/scans/${scanId}/report`} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white hover:border-lime-300/40">Open report</Link>{error && <button onClick={() => { setError(''); setRetry((value) => value + 1); }} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white"><RefreshCw size={14}/>Retry</button>}</div></div>

    {error && <div role="alert" className="mb-5 rounded-xl border border-rose-400/30 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div>}
    <section className={`${panel} mb-6`}><div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-white">{status?.currentStep || 'Reading backend scan state…'}</p><p className="mt-1 font-mono text-xs text-zinc-500">{status?.status || 'CONNECTING'} · {status?.progress ?? 0}%</p></div>{done ? <CircleCheck className="text-lime-300"/> : status?.status === 'FAILED' ? <CircleDot className="text-rose-300"/> : <LoaderCircle className="animate-spin text-lime-300"/>}</div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${status?.status === 'FAILED' ? 'bg-rose-400' : 'bg-lime-300'}`} style={{ width: `${Math.max(0, Math.min(status?.progress ?? 0, 100))}%` }}/></div><ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stages.map(([key, label], index) => { const complete = status?.status === 'COMPLETED' || (activeStage >= 0 && index < activeStage); const current = status?.status === key; return <li key={key} className="flex items-start gap-2.5 text-xs"><span className="mt-0.5">{complete ? <CircleCheck size={15} className="text-lime-300"/> : current ? <CircleDot size={15} className="text-amber-300"/> : <CircleDashed size={15} className="text-zinc-700"/>}</span><span className={complete ? 'text-zinc-300' : current ? 'text-amber-100' : 'text-zinc-600'}>{label}{current && <span className="ml-2 text-zinc-500">· backend active</span>}</span></li>; })}</ol>{status?.status === 'FAILED' && <p className="mt-4 text-sm text-rose-200">Backend error: {status.error || scan?.error || 'Scan failed. Check target availability, OpenAPI validity, and credentials.'}</p>}</section>

    {scan && scan.status === 'COMPLETED' && <><section className="mb-6 grid gap-4 sm:grid-cols-3"><div className={panel}><p className="text-xs uppercase text-zinc-500">Findings</p><p className="mt-2 text-3xl font-semibold text-white">{scan.findings?.length ?? 0}</p></div><div className={panel}><p className="text-xs uppercase text-zinc-500">Endpoints discovered</p><p className="mt-2 text-3xl font-semibold text-white">{scan.endpoints?.length ?? 0}</p></div><div className={panel}><p className="text-xs uppercase text-zinc-500">Observed attack paths</p><p className="mt-2 text-3xl font-semibold text-white">{scan.attackPaths?.length ?? 0}</p></div></section>

      <section className={`${panel} mb-6`}><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-white">Findings · evidence · impact</h2><p className="mt-1 text-xs text-zinc-500">Deterministic results and sanitized evidence from this scan.</p></div><Link href={`/scans/${scanId}/report`} className="inline-flex items-center gap-1 text-xs text-lime-200">Browser report <ExternalLink size={13}/></Link></div>{scan.findings?.length ? <div className="grid gap-3">{scan.findings.map((finding) => <Link key={finding.id} href={`/findings/${finding.id}`} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-lime-300/30 md:grid-cols-[120px_1fr_auto] md:items-center"><div><span className="font-mono text-xs text-lime-200">{finding.vulnerabilityType}</span><p className="mt-1 text-[10px] uppercase text-zinc-500">{finding.severity} · {finding.confidence}% confidence</p></div><div><p className="text-sm font-medium text-white">{finding.title}</p><p className="mt-1 font-mono text-xs text-zinc-500">{finding.method} {finding.endpoint} · impacts {finding.impact.directlyExposed.join(', ') || 'not observed'}</p></div><span className="text-xs text-zinc-500">Evidence & details →</span></Link>)}</div> : <p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-400">The backend completed this scan and returned no findings for the selected checks.</p>}</section>

      <section className={`${panel} mb-6`}><div className="mb-4"><h2 className="font-semibold text-white">Authorization model</h2><p className="mt-1 text-xs text-zinc-500">Resources: {scan.resources?.length ?? 0} · relationships: {scan.relationships?.length ?? 0}</p></div><AuthorizationGraph nodes={scan.graph?.nodes ?? []} edges={scan.graph?.edges ?? []}/></section>

      <section className={`${panel} mb-6`}><h2 className="mb-4 font-semibold text-white">Endpoint explorer</h2>{scan.endpoints?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="text-zinc-500"><tr><th className="p-3">Method</th><th className="p-3">Path</th><th className="p-3">Auth</th><th className="p-3">Roles</th><th className="p-3">Tested</th><th className="p-3">Findings</th></tr></thead><tbody>{scan.endpoints.map((endpoint) => { const findings = scan.findings?.filter((finding) => finding.endpoint === endpoint.path) ?? []; const tested = scan.testedEndpointIds?.includes(endpoint.id) ?? false; return <tr key={endpoint.id} className="border-t border-white/5"><td className="p-3 font-mono text-lime-200">{endpoint.method.toUpperCase()}</td><td className="p-3 font-mono text-zinc-300">{endpoint.path}</td><td className="p-3 text-zinc-400">{endpoint.authenticationRequired ? 'Required' : 'Not required'}</td><td className="p-3 text-zinc-400">{endpoint.roles.join(', ') || '—'}</td><td className="p-3 text-zinc-400">{tested ? 'Yes' : 'No'}</td><td className="p-3">{findings.length ? findings.map((finding) => <Link key={finding.id} href={`/findings/${finding.id}`} className="mr-2 text-amber-200 underline">{finding.vulnerabilityType}</Link>) : <span className="text-zinc-600">No finding</span>}</td></tr>; })}</tbody></table></div> : <p className="text-sm text-zinc-500">No parsed endpoints returned by the backend.</p>}</section>

      <section className={`${panel}`}><h2 className="mb-4 font-semibold text-white">Attack paths observed by backend</h2>{scan.attackPaths?.length ? scan.attackPaths.map((path) => <div key={path.id} className="mb-3 rounded-xl border border-white/10 p-4"><p className="font-mono text-xs text-orange-200">{path.steps.map((step) => step.label).join(' → ')}</p><p className="mt-2 text-xs text-zinc-500">Entry point {path.entryPoint} · depth {path.depth} · exposed: {path.affectedResources.join(', ')}</p>{path.branches?.length ? <ul className="mt-2 flex flex-wrap gap-2">{path.branches.map((branch) => <li key={`${branch.resourceId}:${branch.objectId}`} className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-zinc-300">{branch.resourceId} #{branch.objectId} · depth {branch.depth}</li>)}</ul> : null}</div>) : <p className="text-sm text-zinc-500">No confirmed paths were returned for this scan.</p>}</section>
    </>}
  </div></main>;
}

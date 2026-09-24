'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import AmbientBackground from '@/components/cyber/ambient-background';
import { AuthorizationGraph } from '@/components/scans/authorization-graph';
import { getEvidence, getFinding, getFindingPath } from '@/lib/api/findings';
import { getGraph } from '@/lib/api/scans';
import type { AttackPath, Evidence, Finding, GraphEdge, GraphNode } from '@/lib/api/types';

const panel = 'rounded-2xl border border-white/10 bg-[#111113]/85 p-5';
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export default function FindingPage() {
  const { findingId } = useParams<{ findingId: string }>();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [path, setPath] = useState<AttackPath | null>(null);
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const record = await getFinding(findingId);
        const [proof, attackPath, authGraph] = await Promise.all([
          getEvidence(findingId), getFindingPath(findingId), getGraph(record.scanId),
        ]);
        if (active) { setFinding(record); setEvidence(proof); setPath(attackPath); setGraph(authGraph); }
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load finding.'); }
    })();
    return () => { active = false; };
  }, [findingId]);

  const copyPoc = async () => { if (!finding) return; await navigator.clipboard.writeText(finding.poc); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return <main className="relative min-h-screen overflow-hidden px-5 pb-20 pt-28 sm:px-8"><AmbientBackground/><div className="relative z-10 mx-auto max-w-6xl"><Link href="/dashboard" className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/>Dashboard</Link>{error && <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div>}
    {!finding && !error && <p className="text-sm text-zinc-500">Loading finding from backend…</p>}
    {finding && <><header className="mb-6"><p className="font-mono text-xs uppercase tracking-[.25em] text-lime-300">Verified backend finding · {finding.vulnerabilityType}</p><h1 className="mt-2 max-w-4xl text-3xl font-bold text-white">{finding.title}</h1><p className="mt-3 font-mono text-sm text-zinc-400">{finding.method} {finding.endpoint} · <span className="uppercase text-amber-200">{finding.severity}</span> · {finding.confidence}% confidence</p><div className="mt-3 flex gap-4"><Link href={`/scans/${finding.scanId}`} className="text-xs text-lime-200 underline">View scan and endpoint explorer</Link><Link href={`/scans/${finding.scanId}/attack-paths?finding=${finding.id}`} className="text-xs text-orange-200 underline">Open Attack Path</Link></div></header>

    <div className="grid gap-5 lg:grid-cols-2"><section className={panel}><h2 className="mb-4 font-semibold text-white">Contextual impact</h2><div className="grid grid-cols-2 gap-3 text-xs">{[['Direct resources', finding.impact.directlyExposed], ['Indirectly reachable', finding.impact.indirectlyReachable], ['Sensitive fields', finding.impact.sensitiveFields], ['Affected identities', finding.impact.affectedIdentities]].map(([label, values]) => <div key={label as string} className="rounded-lg border border-white/10 p-3"><p className="mb-2 text-zinc-500">{label as string}</p><p className="text-zinc-200">{(values as string[]).join(', ') || 'None observed'}</p></div>)}</div><p className="mt-4 text-xs text-zinc-400">Attack path depth: {finding.impact.attackPathDepth} · {finding.impact.privilegeDifference}</p></section>

    <section className={panel}><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Reproduce with PoC</h2><button onClick={() => void copyPoc()} className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-zinc-300">{copied ? <Check size={13}/> : <Copy size={13}/>}Copy</button></div><p className="mb-3 text-xs text-zinc-500">Backend-generated request using a placeholder token. Add only an authorized test identity’s token.</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/50 p-4 font-mono text-xs leading-5 text-lime-100">{finding.poc}</pre></section></div>

    <section className={`${panel} mt-5`}><h2 className="mb-2 font-semibold text-white">Remediation</h2><p className="text-sm leading-6 text-lime-100">{finding.remediation}</p></section>
    <section className={`${panel} mt-5`}><div className="mb-3"><h2 className="font-semibold text-white">Evidence grounded in actual requests</h2><p className="mt-1 text-xs text-zinc-500">Sanitized observations from the scanner. Authorization headers and sensitive response values are redacted.</p></div>{evidence ? <><p className="mb-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100">{evidence.authorizationViolation} · ownership: {evidence.ownershipEvidence}</p><div className="grid gap-4 lg:grid-cols-2">{[['Attacker baseline request', evidence.originalRequest], ['Attacker baseline response', evidence.originalResponse], ['Cross-identity request', evidence.modifiedRequest], ['Observed response', evidence.modifiedResponse], ['Victim baseline request', evidence.victimBaselineRequest], ['Victim baseline response', evidence.victimBaselineResponse]].map(([label, value]) => <div key={label as string}><h3 className="mb-2 text-xs font-medium text-zinc-400">{label as string}</h3><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-3 font-mono text-[11px] leading-5 text-zinc-300">{pretty(value ?? { note: 'No victim baseline was recorded for this finding type.' })}</pre></div>)}</div><div className="mt-4"><p className="mb-2 text-xs font-medium text-zinc-400">Confirmation checks</p><ul className="grid gap-2 sm:grid-cols-2">{evidence.confirmationChecks.map((check) => <li key={check} className="rounded-lg border border-white/10 p-2.5 text-xs text-zinc-300">✓ {check}</li>)}</ul></div></> : <p className="text-sm text-zinc-500">Evidence endpoint returned no evidence.</p>}</section>

    <section className={`${panel} mt-5`}><h2 className="mb-4 font-semibold text-white">Authorization graph</h2>{graph ? <AuthorizationGraph nodes={graph.nodes} edges={graph.edges}/> : <p className="text-sm text-zinc-500">Graph not loaded yet.</p>}</section>
    <section className={`${panel} mt-5`}><h2 className="mb-3 font-semibold text-white">Related attack path</h2>{path ? <><p className="font-mono text-sm leading-7 text-orange-100">{path.steps.map((step) => step.label).join(' → ')}</p><p className="mt-2 text-xs text-zinc-500">Entry: {path.entryPoint} · depth {path.depth} · impacted resources: {path.affectedResources.join(', ')}</p>{path.branches?.length ? <div className="mt-4 grid gap-2 sm:grid-cols-3">{path.branches.map((branch) => <div key={`${branch.resourceId}-${branch.objectId}`} className="rounded-lg border border-white/10 p-3 text-xs text-zinc-300"><strong>{branch.resourceId} #{branch.objectId}</strong><p className="mt-1 text-zinc-500">Observed branch · depth {branch.depth}</p></div>)}</div> : null}</> : <p className="text-sm text-zinc-500">The backend did not associate an attack path with this finding.</p>}</section></>}
  </div></main>;
}

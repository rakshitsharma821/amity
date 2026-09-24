'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import AmbientBackground from '@/components/cyber/ambient-background';
import { AuthorizationGraph } from '@/components/scans/authorization-graph';
import { getFinding } from '@/lib/api/findings';
import { getAttackPaths, getGraph } from '@/lib/api/scans';
import type { AttackPath, Finding, GraphEdge, GraphNode } from '@/lib/api/types';

const panel = 'rounded-2xl border border-white/10 bg-[#111113]/85 p-5';
export default function AttackPathsPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const search = useSearchParams();
  const findingId = search.get('finding');
  const [paths, setPaths] = useState<AttackPath[]>([]);
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [finding, setFinding] = useState<Finding | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void Promise.all([getAttackPaths(scanId), getGraph(scanId), findingId ? getFinding(findingId) : Promise.resolve(null)])
      .then(([items, model, item]) => { if (active) { setPaths(items); setGraph(model); setFinding(item); } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to read the backend attack path.'); });
    return () => { active = false; };
  }, [findingId, scanId]);
  const related = finding ? paths.filter((path) => path.id === finding.attackPathId) : paths;
  return <main className="relative min-h-screen overflow-hidden px-5 pb-20 pt-28 sm:px-8"><AmbientBackground/><div className="relative z-10 mx-auto max-w-6xl"><Link href={`/scans/${scanId}`} className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/>Back to scan</Link><p className="font-mono text-xs uppercase tracking-[.25em] text-orange-200">Observed authorization paths</p><h1 className="mt-2 text-3xl font-bold text-white">Attack path & blast radius</h1><p className="mt-2 text-sm text-zinc-400">Every step and downstream branch below comes from the scan’s backend graph/path response. Cross-resource requests are described as observed branches where the model found sibling links.</p>{error && <div role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div>}
    {finding && <section className={`${panel} mt-6`}><h2 className="font-semibold text-white">Finding context · {finding.vulnerabilityType}</h2><p className="mt-2 text-sm text-zinc-300">{finding.title}</p><p className="mt-2 text-xs text-zinc-500">{finding.impact.privilegeDifference}</p><div className="mt-3 flex flex-wrap gap-2">{finding.impact.directlyExposed.map((item) => <span key={item} className="rounded-md bg-rose-300/10 px-2 py-1 text-xs text-rose-100">Direct: {item}</span>)}{finding.impact.indirectlyReachable.map((item) => <span key={item} className="rounded-md bg-orange-300/10 px-2 py-1 text-xs text-orange-100">Reachable: {item}</span>)}{finding.impact.sensitiveFields.map((item) => <span key={item} className="rounded-md bg-amber-300/10 px-2 py-1 text-xs text-amber-100">Sensitive: {item}</span>)}</div><Link href={`/findings/${finding.id}`} className="mt-4 inline-block text-xs text-lime-200 underline">Open finding evidence and remediation</Link></section>}
    <section className={`${panel} mt-6`}><h2 className="mb-4 font-semibold text-white">Authorization graph</h2>{graph ? <AuthorizationGraph nodes={graph.nodes} edges={graph.edges}/> : <p className="text-sm text-zinc-500">Loading graph…</p>}</section>
    <section className={`${panel} mt-6`}><h2 className="mb-4 font-semibold text-white">{finding ? 'Path associated with this finding' : 'Paths returned by scan'}</h2>{related.length ? related.map((path) => <article key={path.id} className="mb-4 rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-zinc-500">{path.entryPoint} · depth {path.depth} · attacker {path.attacker}</p><p className="mt-3 text-sm leading-7 text-orange-100">{path.steps.map((step) => step.label).join(' → ')}</p></div><span className="rounded-full bg-orange-300/10 px-3 py-1 text-xs text-orange-100">{path.affectedResources.length} affected resources</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(path.branches ?? []).map((branch) => <div key={`${branch.resourceId}:${branch.objectId}`} className="rounded-lg border border-white/10 p-3"><p className="text-sm text-white">{branch.resourceId} #{branch.objectId}</p><p className="mt-1 text-xs text-zinc-500">Observed downstream branch · depth {branch.depth}</p><p className="mt-2 font-mono text-[10px] text-zinc-400">{branch.steps.map((step) => step.label).join(' → ')}</p></div>)}</div><p className="mt-4 text-xs text-zinc-400">Affected resources: {path.affectedResources.join(', ') || 'none reported'}{path.sensitiveData.length ? ` · sensitive data: ${path.sensitiveData.join(', ')}` : ''}</p></article>) : <p className="text-sm text-zinc-500">No attack path was returned for this selection.</p>}</section>
  </div></main>;
}

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getReport, getScan } from '@/lib/api/scans';
import type { Scan } from '@/lib/api/types';

export default function ReportPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; void Promise.all([getScan(scanId), getReport(scanId)]).then(([s, r]) => { if (active) { setScan(s); setReport(r); } }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load report.'); }); return () => { active = false; }; }, [scanId]);
  return <main className="min-h-screen px-5 pb-20 pt-28 sm:px-8"><div className="mx-auto max-w-5xl"><Link href={`/scans/${scanId}`} className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/>Back to scan</Link><p className="font-mono text-xs uppercase tracking-[.25em] text-lime-300">Backend-generated report</p><h1 className="mt-2 text-3xl font-bold text-white">Security assessment</h1><p className="mt-2 font-mono text-xs text-zinc-500">{scanId}</p>{error && <div role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div>}{!report && !error && <p className="mt-6 text-sm text-zinc-500">Loading report…</p>}
    {scan && report && <><section className="mt-6 grid gap-4 sm:grid-cols-4">{[['Findings', scan.findings?.length ?? 0], ['Discovered endpoints', scan.endpoints?.length ?? 0], ['Resources', scan.resources?.length ?? 0], ['Attack paths', scan.attackPaths?.length ?? 0]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-[#111113] p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl text-white">{value}</p></div>)}</section><section className="mt-6 rounded-2xl border border-white/10 bg-[#111113] p-5"><h2 className="mb-4 font-semibold text-white">Security findings</h2>{scan.findings?.length ? <div className="space-y-3">{scan.findings.map((finding) => <Link key={finding.id} href={`/findings/${finding.id}`} className="block rounded-lg border border-white/10 p-4 hover:border-lime-300/30"><span className="font-mono text-xs text-lime-200">{finding.vulnerabilityType} · {finding.severity}</span><p className="mt-1 text-sm text-white">{finding.title}</p><p className="mt-1 text-xs text-zinc-500">{finding.method} {finding.endpoint} · {finding.impact.directlyExposed.join(', ')} · {finding.impact.sensitiveFields.join(', ')}</p></Link>)}</div> : <p className="text-sm text-zinc-400">No findings returned for this scan.</p>}</section><section className="mt-6 rounded-2xl border border-white/10 bg-[#111113] p-5"><h2 className="mb-3 font-semibold text-white">Backend report payload</h2><p className="mb-3 text-xs text-zinc-500">Structured response returned by GET /api/scans/:id/report.</p><pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-4 font-mono text-xs text-zinc-300">{JSON.stringify(report, null, 2)}</pre></section><button onClick={() => window.print()} className="mt-5 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-zinc-200 print:hidden">Print / Save as PDF</button></>}
  </div></main>;
}

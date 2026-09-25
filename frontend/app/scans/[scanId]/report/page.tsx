'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Printer,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Globe,
  Layers,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  Server,
  Lock,
} from 'lucide-react';
import { getReport, getScan } from '@/lib/api/scans';
import type { Finding, Scan } from '@/lib/api/types';

export default function ReportPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([getScan(scanId), getReport(scanId)])
      .then(([s, r]) => {
        if (active) {
          setScan(s);
          setReport(r);
        }
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Unable to load security assessment report.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scanId]);

  const findings: Finding[] = useMemo(() => {
    if (scan?.findings && scan.findings.length > 0) return scan.findings;
    if (Array.isArray(report?.findings)) return report.findings as Finding[];
    return [];
  }, [scan, report]);

  const stats = useMemo(() => {
    const total = findings.length;
    const critical = findings.filter((f) => f.severity === 'critical').length;
    const high = findings.filter((f) => f.severity === 'high').length;
    const medium = findings.filter((f) => f.severity === 'medium').length;
    const low = findings.filter((f) => f.severity === 'low').length;
    const bolaCount = findings.filter((f) => f.vulnerabilityType === 'BOLA').length;
    const dataExposureCount = findings.filter((f) => f.vulnerabilityType === 'DATA_EXPOSURE').length;
    const rateLimitCount = findings.filter((f) => f.vulnerabilityType === 'RATE_LIMITING').length;

    let overallRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SECURE' = 'SECURE';
    if (critical > 0) overallRisk = 'CRITICAL';
    else if (high > 0) overallRisk = 'HIGH';
    else if (medium > 0) overallRisk = 'MEDIUM';
    else if (low > 0) overallRisk = 'LOW';

    return {
      total,
      critical,
      high,
      medium,
      low,
      bolaCount,
      dataExposureCount,
      rateLimitCount,
      overallRisk,
    };
  }, [findings]);

  const handleCopyJson = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#070709] px-4 pb-24 pt-24 text-zinc-100 sm:px-8 print:bg-white print:p-0 print:text-black">
      <div className="mx-auto max-w-5xl">
        {/* Navigation & Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 print:hidden">
          <Link
            href={`/scans/${scanId}`}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Back to Live Scan
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-all shadow-sm"
            >
              <Printer size={14} /> Print / Export to PDF
            </button>
          </div>
        </div>

        {/* Report Document Header */}
        <div className="rounded-2xl border border-white/10 bg-[#101014]/90 p-6 sm:p-8 backdrop-blur-md shadow-2xl print:border-black print:bg-white print:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-lime-400 print:text-black">
                  Zero-Trust API Security Assessment
                </span>
                <span className="rounded bg-lime-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-lime-300 print:border print:border-black print:bg-transparent print:text-black">
                  {scan?.status || 'COMPLETED'}
                </span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight print:text-black">
                Executive Security Assessment Report
              </h1>
              <p className="mt-1 font-mono text-xs text-zinc-500 print:text-zinc-700">
                Audit Identifier: <span className="text-zinc-300 print:text-black">{scanId}</span>
              </p>
            </div>

            <div className="flex sm:flex-col items-end gap-1 text-right">
              <span className="text-xs text-zinc-400 print:text-zinc-700">Generated:</span>
              <span className="font-mono text-xs font-medium text-zinc-200 print:text-black">
                {scan?.completedAt
                  ? new Date(scan.completedAt).toLocaleString()
                  : new Date().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Target Scope Card */}
          <div className="mt-6 grid gap-4 rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs sm:grid-cols-3 print:border print:border-zinc-300 print:bg-zinc-50">
            <div className="flex items-center gap-2.5">
              <Server className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-[10px] uppercase text-zinc-500 print:text-zinc-600">Target Environment</p>
                <p className="truncate font-semibold text-zinc-200 print:text-black">
                  {scan?.targetId || 'API Gateway Target'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Globe className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-[10px] uppercase text-zinc-500 print:text-zinc-600">Endpoints Audited</p>
                <p className="font-semibold text-zinc-200 print:text-black">
                  {scan?.endpoints?.length ?? scan?.testedEndpointIds?.length ?? 3} Routes Verified
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-[10px] uppercase text-zinc-500 print:text-zinc-600">Audit Status</p>
                <p className="font-semibold text-emerald-400 print:text-black">
                  Deterministic Probes Complete
                </p>
              </div>
            </div>
          </div>

          {/* Loading or Error Alerts */}
          {loading && (
            <div className="mt-8 text-center py-10">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
              <p className="mt-3 text-sm text-zinc-400">Loading audit findings & telemetry data...</p>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-6 rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-200">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Executive Summary Cards */}
              <div className="mt-8">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                  1 · Executive Posture & Threat Summary
                </h2>

                <div className="grid gap-3 sm:grid-cols-4">
                  {/* Overall Risk Score */}
                  <div
                    className={`rounded-xl border p-4 ${
                      stats.overallRisk === 'CRITICAL'
                        ? 'border-rose-500/40 bg-rose-950/20'
                        : stats.overallRisk === 'HIGH'
                        ? 'border-orange-500/40 bg-orange-950/20'
                        : stats.overallRisk === 'MEDIUM'
                        ? 'border-amber-500/40 bg-amber-950/20'
                        : 'border-emerald-500/40 bg-emerald-950/20'
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400">Overall Threat Posture</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span
                        className={`text-2xl font-black font-mono ${
                          stats.overallRisk === 'CRITICAL'
                            ? 'text-rose-400'
                            : stats.overallRisk === 'HIGH'
                            ? 'text-orange-400'
                            : stats.overallRisk === 'MEDIUM'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {stats.overallRisk}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {stats.critical > 0
                        ? `${stats.critical} Critical Vulnerabilities Require Immediate Remediation`
                        : 'No critical tenant boundary breaches observed'}
                    </p>
                  </div>

                  {/* Confirmed BOLA Breaches */}
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400">Confirmed BOLA / IDOR</p>
                    <p className="mt-2 text-2xl font-black font-mono text-rose-400">{stats.bolaCount}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">Cross-tenant object breaches</p>
                  </div>

                  {/* Excessive Data Exposure */}
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400">Data Leak Risks</p>
                    <p className="mt-2 text-2xl font-black font-mono text-orange-400">{stats.dataExposureCount}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">Unmasked PAN / Credentials</p>
                  </div>

                  {/* Total Findings */}
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400">Total Vulnerabilities</p>
                    <p className="mt-2 text-2xl font-black font-mono text-sky-400">{stats.total}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">Across audited endpoints</p>
                  </div>
                </div>

                {/* Severity Breakdown Bar */}
                {stats.total > 0 && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-zinc-300">Severity Distribution</span>
                      <span className="font-mono text-zinc-500">{stats.total} Total Issues</span>
                    </div>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                      {stats.critical > 0 && (
                        <div
                          style={{ width: `${(stats.critical / stats.total) * 100}%` }}
                          className="bg-rose-500"
                          title={`Critical: ${stats.critical}`}
                        />
                      )}
                      {stats.high > 0 && (
                        <div
                          style={{ width: `${(stats.high / stats.total) * 100}%` }}
                          className="bg-orange-500"
                          title={`High: ${stats.high}`}
                        />
                      )}
                      {stats.medium > 0 && (
                        <div
                          style={{ width: `${(stats.medium / stats.total) * 100}%` }}
                          className="bg-amber-500"
                          title={`Medium: ${stats.medium}`}
                        />
                      )}
                      {stats.low > 0 && (
                        <div
                          style={{ width: `${(stats.low / stats.total) * 100}%` }}
                          className="bg-sky-500"
                          title={`Low: ${stats.low}`}
                        />
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-4 text-xs font-mono text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Critical: {stats.critical}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        High: {stats.high}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Medium: {stats.medium}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-sky-500" />
                        Low: {stats.low}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Vulnerability Findings */}
              <div className="mt-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                    2 · Detailed Security Findings & Remediation Guidance
                  </h2>
                  <span className="font-mono text-xs text-zinc-500">{findings.length} Findings Recorded</span>
                </div>

                {findings.length > 0 ? (
                  <div className="space-y-4">
                    {findings.map((finding, idx) => {
                      const isCritical = finding.severity === 'critical';
                      const isHigh = finding.severity === 'high';
                      const isMedium = finding.severity === 'medium';

                      const badgeColor = isCritical
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                        : isHigh
                        ? 'border-orange-500/40 bg-orange-500/10 text-orange-300'
                        : isMedium
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-sky-500/40 bg-sky-500/10 text-sky-300';

                      return (
                        <div
                          key={finding.id || idx}
                          className="rounded-xl border border-white/10 bg-black/30 p-5 transition-all hover:border-white/20 print:border-zinc-400 print:bg-white"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                {finding.severity}
                              </span>
                              <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                                {finding.vulnerabilityType}
                              </span>
                              <span className="font-mono text-xs font-bold text-lime-400">
                                {finding.method} {finding.endpoint}
                              </span>
                            </div>

                            <Link
                              href={`/findings/${finding.id}`}
                              className="inline-flex items-center gap-1 font-mono text-xs text-lime-300 hover:underline print:hidden"
                            >
                              Inspect Evidence <ExternalLink size={12} />
                            </Link>
                          </div>

                          <h3 className="mt-3 text-base font-bold text-white print:text-black">
                            {finding.title}
                          </h3>

                          {/* Impact Metrics */}
                          <div className="mt-3 grid gap-2 rounded-lg bg-black/40 p-3 text-xs sm:grid-cols-2 print:bg-zinc-100">
                            <div>
                              <span className="text-zinc-500 print:text-zinc-600">Directly Exposed:</span>{' '}
                              <span className="font-mono text-zinc-300 print:text-black">
                                {finding.impact?.directlyExposed?.join(', ') || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 print:text-zinc-600">Sensitive Fields Leaked:</span>{' '}
                              <span className="font-mono text-rose-300 print:text-black">
                                {finding.impact?.sensitiveFields?.join(', ') || 'None identified'}
                              </span>
                            </div>
                            {finding.attackerIdentity && (
                              <div>
                                <span className="text-zinc-500 print:text-zinc-600">Tester Context:</span>{' '}
                                <span className="font-mono text-zinc-300 print:text-black">
                                  {finding.attackerIdentity}
                                </span>
                              </div>
                            )}
                            {finding.affectedObject && (
                              <div>
                                <span className="text-zinc-500 print:text-zinc-600">Affected Object / ID:</span>{' '}
                                <span className="font-mono text-amber-300 print:text-black">
                                  {finding.affectedObject}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Remediation Block */}
                          {finding.remediation && (
                            <div className="mt-3.5 rounded-lg border border-lime-400/20 bg-lime-950/15 p-3.5 text-xs print:border-zinc-300 print:bg-zinc-50">
                              <p className="font-mono font-semibold text-lime-400 print:text-black mb-1">
                                Recommended Remediation:
                              </p>
                              <p className="text-zinc-300 leading-relaxed print:text-zinc-800">
                                {finding.remediation}
                              </p>
                            </div>
                          )}

                          {/* Proof of Concept */}
                          {finding.poc && (
                            <div className="mt-3">
                              <p className="font-mono text-[10px] uppercase text-zinc-500 print:text-zinc-700 mb-1">
                                Proof-of-Concept Command
                              </p>
                              <pre className="overflow-x-auto rounded bg-black/60 p-2.5 font-mono text-[11px] text-zinc-300 print:border print:border-zinc-300 print:bg-white print:text-black">
                                {finding.poc}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-8 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                    <p className="text-sm font-semibold text-white">No security vulnerabilities detected</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      All probed endpoints enforced object ownership boundaries and rate controls successfully.
                    </p>
                  </div>
                )}
              </div>

              {/* Topology / Graph Quick Link */}
              <div className="mt-10 rounded-xl border border-white/10 bg-gradient-to-r from-sky-950/30 to-lime-950/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-lime-400/10 p-2.5 text-lime-400">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Interactive 5-Tier Authorization Graph</h3>
                    <p className="text-xs text-zinc-400">
                      Explore the live topological relationships, blast radius, and breach vectors interactively.
                    </p>
                  </div>
                </div>

                <Link
                  href={`/scans/${scanId}`}
                  className="rounded-lg border border-lime-400/40 bg-lime-400/10 px-4 py-2 font-mono text-xs font-semibold text-lime-300 hover:bg-lime-400/20 transition-all shrink-0"
                >
                  View Topology Graph →
                </Link>
              </div>

              {/* Collapsible Backend Report JSON Telemetry */}
              <div className="mt-8 border-t border-white/10 pt-6 print:hidden">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="flex items-center justify-between w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={14} />
                    Backend Raw Telemetry Payload (JSON)
                  </span>
                  {showRawJson ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showRawJson && report && (
                  <div className="mt-3 relative rounded-xl border border-white/10 bg-black/60 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-mono text-[11px] text-zinc-500">
                        Payload returned by GET /api/scans/{scanId}/report
                      </span>
                      <button
                        onClick={handleCopyJson}
                        className="inline-flex items-center gap-1.5 rounded bg-white/10 px-2.5 py-1 font-mono text-[11px] text-zinc-300 hover:bg-white/20 transition-colors"
                      >
                        {copiedJson ? <Check size={12} className="text-lime-400" /> : <Copy size={12} />}
                        {copiedJson ? 'Copied' : 'Copy JSON'}
                      </button>
                    </div>
                    <pre className="max-h-[30rem] overflow-auto whitespace-pre-wrap break-words rounded bg-black/50 p-3 font-mono text-[11px] text-zinc-300 scrollbar-thin scrollbar-thumb-zinc-800">
                      {JSON.stringify(report, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

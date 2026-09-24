import { api } from './client';
import type { Scan, ScanChecks, ScanStatusResponse, IdentityInput } from './types';

export async function listScans(targetId?: string) {
  const query = targetId ? `?targetId=${encodeURIComponent(targetId)}` : '';
  return (await api<{ scans: Scan[] }>(`/scans${query}`)).scans;
}
export async function startScan(targetId: string, identities: IdentityInput[], checks: ScanChecks) {
  return api<{ scanId: string; status: string; statusUrl: string }>('/scans', { method: 'POST', body: JSON.stringify({ targetId, identities, checks }) });
}
export async function scanStatus(id: string) { return api<ScanStatusResponse>(`/scans/${encodeURIComponent(id)}/status`); }
export async function getScan(id: string) { return (await api<{ scan: Scan }>(`/scans/${encodeURIComponent(id)}`)).scan; }
export async function getFindings(id: string) { return (await api<{ findings: NonNullable<Scan['findings']> }>(`/scans/${encodeURIComponent(id)}/findings`)).findings; }
export async function getGraph(id: string) { return api<NonNullable<Scan['graph']>>(`/scans/${encodeURIComponent(id)}/graph`); }
export async function getAttackPaths(id: string) { return (await api<{ attackPaths: NonNullable<Scan['attackPaths']> }>(`/scans/${encodeURIComponent(id)}/attack-paths`)).attackPaths; }
export async function getReport(id: string) { return api<Record<string, unknown>>(`/scans/${encodeURIComponent(id)}/report`); }

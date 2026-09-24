import { api } from './client';
import type { AttackPath, Evidence, Finding } from './types';

export async function getFinding(id: string) { return (await api<{ finding: Finding }>(`/findings/${encodeURIComponent(id)}`)).finding; }
export async function getEvidence(id: string) { return (await api<{ evidence: Evidence }>(`/findings/${encodeURIComponent(id)}/evidence`)).evidence; }
export async function getFindingPath(id: string) { return (await api<{ attackPath: AttackPath | null }>(`/findings/${encodeURIComponent(id)}/attack-path`)).attackPath; }

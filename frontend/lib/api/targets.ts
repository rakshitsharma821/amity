import { api } from './client';
import type { OpenApiSummary, Target } from './types';

export const DEMO_IDENTITIES = [
  { id: '1', username: 'primary_actor', role: 'user', ownedResources: { user: ['1'], order: ['1', '2'] } },
  { id: '2', username: 'secondary_actor', role: 'user', ownedResources: { user: ['2'], order: ['3', '4'] } },
];

export async function listTargets() { return (await api<{ targets: Target[] }>('/targets')).targets; }
export async function getTargetSummary(targetId: string) { return (await api<{ summary: OpenApiSummary }>(`/targets/${encodeURIComponent(targetId)}/summary`)).summary; }
export async function registerDemoTarget() {
  return (await api<{ target: Target }>('/targets', { method: 'POST', body: JSON.stringify({
    name: 'Sandbox API Environment', baseUrl: 'http://127.0.0.1:4000', openApiUrl: 'http://127.0.0.1:4000/openapi.json',
    sandboxMode: true, demoSandbox: true, authorized: true, allowDestructiveTests: true, identities: DEMO_IDENTITIES,
  }) })).target;
}
export async function registerSandboxTarget(name: string, baseUrl: string, openApiUrl: string) {
  return (await api<{ target: Target }>('/targets', { method: 'POST', body: JSON.stringify({ name, baseUrl, openApiUrl, sandboxMode: true, authorized: true, allowDestructiveTests: false, identities: [
    { id: 'actor_primary', username: 'actor_primary', role: 'user', ownedResources: {} },
    { id: 'actor_target', username: 'actor_target', role: 'user', ownedResources: {} },
  ] }) })).target;
}

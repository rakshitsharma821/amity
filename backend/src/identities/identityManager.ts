import type { Identity, Target } from '../models/types.js';

export async function authenticateIdentities(identities: Identity[], target: Target, request: (url: string, init?: RequestInit) => Promise<Response>) {
  const tokens = new Map<string, string>();
  for (const identity of identities) {
    if (identity.token) { tokens.set(identity.id, identity.token.startsWith(target.tokenPrefix) ? identity.token : `${target.tokenPrefix}${identity.token}`); continue; }
    if (!identity.credentials) continue;
    const response = await request(new URL(target.loginPath, target.baseUrl).toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(identity.credentials) });
    const text = await response.text(); let payload: unknown;
    try { payload = JSON.parse(text) as unknown; } catch { payload = undefined; }
    let token = payload;
    for (const key of target.tokenJsonPath.split('.')) token = token && typeof token === 'object' ? (token as Record<string, unknown>)[key] : undefined;
    if (response.ok && typeof token === 'string' && token.length > 0) tokens.set(identity.id, `${target.tokenPrefix}${token}`);
  }
  return tokens;
}

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { env } from '../config/env.js';

export async function assertAuthorizedTarget(raw: string, authorized: boolean) {
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash || parsed.search || parsed.pathname !== '/') throw new Error('Target must be an HTTP(S) origin URL without embedded credentials, path, query, or fragment');
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (env.publicDemoMode && parsed.origin !== 'http://127.0.0.1:4000') throw new Error('Public demo mode only permits the bundled loopback sandbox at http://127.0.0.1:4000');
  if (!local && (!authorized || !env.authorizedTargetHosts.has(host))) throw new Error('Target host is not in the explicit sandbox allowlist');
  if (!isIP(host)) {
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (addresses.length === 0) throw new Error('Target host did not resolve');
    if (local && addresses.some((a) => !['127.0.0.1', '::1'].includes(a.address))) throw new Error('Localhost resolved outside loopback; refusing possible DNS rebinding');
  }
  return parsed;
}

export async function sandboxFetch(url: string, baseUrl: string, init: RequestInit = {}) {
  const destination = new URL(url);
  if (destination.origin !== new URL(baseUrl).origin) throw new Error('Request URL escaped the configured target origin');
  return fetch(destination, { ...init, redirect: 'manual', signal: AbortSignal.timeout(env.REQUEST_TIMEOUT_MS) });
}

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { createTargetSchema } from '../../models/schemas.js';
import { store } from '../../db/database.js';
import type { Identity, Target } from '../../models/types.js';
import { sandboxFetch, assertAuthorizedTarget } from '../../utils/targetSafety.js';
import { parseOpenApi } from '../../scanner/parser/openapiParser.js';
import { discoverEndpoints } from '../../scanner/discovery/endpointDiscovery.js';

export const targetsRouter = Router();
targetsRouter.get('/', (_req, res) => res.json({ targets: store.listTargets().map(({ identities: _identities, ...target }) => target) }));
targetsRouter.get('/:id', (req, res) => { const target = store.getTarget(req.params.id); if (!target) return res.status(404).json({ error: 'Target not found' }); const { identities: _identities, ...safe } = target; return res.json({ target: safe }); });
targetsRouter.get('/:id/summary', async (req, res) => {
  const target = store.getTarget(req.params.id);
  if (!target) return res.status(404).json({ error: 'Target not found' });
  try {
    await assertAuthorizedTarget(target.baseUrl, target.authorized);
    const spec = target.openApiDocument
      ? target.openApiDocument
      : await (async () => {
          const response = await sandboxFetch(target.openApiUrl, target.baseUrl, { headers: { Accept: 'application/json, application/yaml, text/yaml' } });
          if (!response.ok) throw new Error(`OpenAPI fetch failed with HTTP ${response.status}`);
          return response.text();
        })();
    const parsed = parseOpenApi(spec);
    const endpoints = discoverEndpoints(parsed.endpoints).map((endpoint) => ({ id: endpoint.id, path: endpoint.path, method: endpoint.method.toUpperCase(), authenticationRequired: endpoint.authenticationRequired, roles: endpoint.roles }));
    const info = parsed.document.info && typeof parsed.document.info === 'object' ? parsed.document.info as Record<string, unknown> : {};
    return res.json({ summary: { title: typeof info.title === 'string' ? info.title : target.name, version: typeof parsed.document.openapi === 'string' ? parsed.document.openapi : typeof info.version === 'string' ? info.version : 'unknown', endpointCount: endpoints.length, resourceCount: parsed.resources.length, relationshipCount: parsed.relationships.length, endpoints } });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to read the target OpenAPI specification' });
  }
});
targetsRouter.post('/', async (req, res) => {
  const parsed = createTargetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid target definition', details: parsed.error.flatten() });
  try {
    const input = parsed.data;
    const base = await assertAuthorizedTarget(input.baseUrl, input.authorized);
    const openApiUrl = input.openApiUrl ?? new URL('/openapi.json', base).toString();
    const specUrl = new URL(openApiUrl);
    if (specUrl.origin !== base.origin) throw new Error('OpenAPI URL must share the configured target origin');
    const safeIdentities: Identity[] = input.identities.map(({ id, username, role, ownedResources }) => ({ id, username, role, ownedResources }));
    if (input.demoSandbox && !['localhost', '127.0.0.1', '::1'].includes(base.hostname.replace(/^\[|\]$/g, '').toLowerCase())) throw new Error('demoSandbox can only be enabled for loopback targets');
    const target: Target = { id: randomUUID(), name: input.name, baseUrl: base.toString().replace(/\/$/, ''), openApiUrl, sandboxMode: input.sandboxMode, demoSandbox: input.demoSandbox, authorized: input.authorized, allowDestructiveTests: input.allowDestructiveTests, loginPath: input.loginPath, tokenJsonPath: input.tokenJsonPath, tokenPrefix: input.tokenPrefix, identities: safeIdentities, openApiDocument: input.openApiDocument, createdAt: new Date().toISOString() };
    store.putTarget(target);
    const { identities: _identities, ...safeTarget } = target;
    return res.status(201).json({ target: safeTarget, message: 'Target registered. Supply test identity credentials with POST /api/scans; credentials are not persisted.' });
  } catch (error) { return res.status(403).json({ error: error instanceof Error ? error.message : 'Target not authorized' }); }
});

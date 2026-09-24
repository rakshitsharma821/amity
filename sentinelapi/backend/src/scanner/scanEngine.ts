import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { store } from '../db/database.js';
import { validateOwnership } from '../authorization/ownershipValidator.js';
import { sanitizeEvidence } from '../evidence/evidenceEngine.js';
import { authenticateIdentities } from '../identities/identityManager.js';
import { analyzeExposure } from '../dataExposure/exposureAnalyzer.js';
import { buildGraph } from '../graph/graphBuilder.js';
import { buildAttackPath } from '../graph/attackPathEngine.js';
import { traverseObservedRelationships } from '../graph/graphTraversal.js';
import { parseOpenApi } from './parser/openapiParser.js';
import { discoverEndpoints } from './discovery/endpointDiscovery.js';
import { analyzeImpact } from '../risk/impactAnalyzer.js';
import { remediation } from '../reporting/remediationEngine.js';
import { sandboxFetch, assertAuthorizedTarget } from '../utils/targetSafety.js';
import type { AttackPath, Endpoint, Evidence, Finding, Identity, Resource, ScanRecord, Target } from '../models/types.js';

type Checks = { bola: boolean; bfla: boolean; dataExposure: boolean; massAssignment: boolean; rateLimiting: boolean; rateLimitRequests: number };
const asJson = async (response: Response) => { const text = await response.text(); try { return JSON.parse(text) as unknown; } catch { return undefined; } };
const deepValuesMatch = (value: unknown, candidate: string): boolean => { if (Array.isArray(value)) return value.some((entry) => deepValuesMatch(entry, candidate)); if (!value || typeof value !== 'object') return false; return Object.entries(value).some(([key, item]) => (/id$/i.test(key) && String(item) === candidate) || deepValuesMatch(item, candidate)); };
const fieldNames = (value: unknown, resource?: Resource) => analyzeExposure(value, resource).exposedFields;
const templateUrl = (base: string, endpoint: Endpoint, values: Record<string, string>) => endpoint.path.replace(/\{([^}]+)\}/g, (_match, key: string) => encodeURIComponent(values[key] ?? ''));
const safeRequestRecord = (method: string, url: string, token?: string, body?: unknown) => ({ method, url, headers: token ? { Authorization: 'Bearer [redacted]', Accept: 'application/json' } : { Accept: 'application/json' }, ...(body ? { body } : {}) });

export async function runScan(scan: ScanRecord, target: Target, identities: Identity[], checks: Checks) {
  let requests = 0;
  const update = (status: ScanRecord['status'], progress: number, currentStep: string) => { scan.status = status; scan.progress = progress; scan.currentStep = currentStep; store.updateScan(scan); console.info(JSON.stringify({ event: 'scan_progress', scanId: scan.id, status, progress })); };
  const request = async (url: string, init: RequestInit = {}) => {
    requests += 1; if (requests > env.MAX_REQUESTS_PER_SCAN) throw new Error('Configured request budget exceeded');
    return sandboxFetch(url, target.baseUrl, init);
  };
  try {
    await assertAuthorizedTarget(target.baseUrl, target.authorized);
    update('PARSING', 5, 'Loading and parsing OpenAPI');
    let specInput: Record<string, unknown> | string;
    if (target.openApiDocument) specInput = target.openApiDocument;
    else {
      const specUrl = new URL(target.openApiUrl);
      if (specUrl.origin !== new URL(target.baseUrl).origin) throw new Error('OpenAPI URL must share the target origin');
      const specResponse = await request(specUrl.toString(), { headers: { Accept: 'application/json, application/yaml, text/yaml' } });
      if (!specResponse.ok) throw new Error(`OpenAPI fetch failed with HTTP ${specResponse.status}`);
      specInput = await specResponse.text();
    }
    const parsed = parseOpenApi(specInput);
    const endpoints = discoverEndpoints(parsed.endpoints);
    scan.endpoints = endpoints;
    update('DISCOVERING', 15, `Discovered ${endpoints.length} endpoints`);
    scan.resources = parsed.resources; scan.relationships = parsed.relationships;
    update('MODELING', 25, `Modeled ${parsed.resources.length} resources and ${parsed.relationships.length} relationships`);
    update('GENERATING_TESTS', 35, 'Preparing controlled authorization probes');
    const tokens = await authenticateIdentities(identities, target, request);
    const attacker = identities[0]; const victim = identities[1];
    const testedEndpointIds = new Set<string>();
    const findings: Finding[] = []; const accesses: Array<{ identityId: string; resourceId: string; objectId: string; unauthorized?: boolean; sensitiveFields?: string[] }> = []; const attackPaths: AttackPath[] = [];
    update('EXECUTING', 45, 'Executing bounded HTTP probes');
    if (checks.bola && attacker && victim && tokens.has(attacker.id) && tokens.has(victim.id)) {
      for (const endpoint of endpoints.filter((e) => e.method === 'get' && e.parameters.some((p) => p.in === 'path'))) {
        const params = endpoint.parameters.filter((p) => p.in === 'path');
        const resourceId = endpoint.path.split('/').filter(Boolean).find((s) => !s.startsWith('{'))?.replace(/s$/, '').toLowerCase() ?? 'resource';
        const ownId = attacker.ownedResources?.[resourceId]?.[0] ?? (resourceId === 'user' ? attacker.id : undefined);
        const victimId = victim.ownedResources?.[resourceId]?.[0] ?? (resourceId === 'user' ? victim.id : undefined);
        // Only probe explicit object IDs supplied by the sandbox owner; never guess object identifiers.
        if (!ownId || !victimId || ownId === victimId) continue;
        testedEndpointIds.add(endpoint.id);
        const ownPath = templateUrl(target.baseUrl, endpoint, Object.fromEntries(params.map((p) => [p.name, ownId])));
        const victimPath = templateUrl(target.baseUrl, endpoint, Object.fromEntries(params.map((p) => [p.name, victimId])));
        const ownResponse = await request(new URL(ownPath, target.baseUrl).toString(), { headers: { Authorization: tokens.get(attacker.id)! } });
        const ownBody = await asJson(ownResponse);
        const victimResponse = await request(new URL(victimPath, target.baseUrl).toString(), { headers: { Authorization: tokens.get(victim.id)! } });
        const victimBody = await asJson(victimResponse);
        if (!ownResponse.ok || !victimResponse.ok || !victimBody) continue;
        const attackResponse = await request(new URL(victimPath, target.baseUrl).toString(), { headers: { Authorization: tokens.get(attacker.id)! } });
        const attackBody = await asJson(attackResponse);
        const owner = validateOwnership(attackBody, victimId, victim.id);
        if (!owner.confirmed && resourceId === 'user' && owner.object && String(owner.object.id) === victim.id) { owner.confirmed = true; owner.ownerId = victim.id; owner.ownerField = 'id (user resource identity)'; }
        if (!attackResponse.ok || !owner.confirmed || owner.ownerId === attacker.id) continue;
        const evidenceId = randomUUID(); const findingId = randomUUID();
        const evidence: Evidence = { id: evidenceId, attacker: attacker.id, victim: victim.id, originalRequest: safeRequestRecord('GET', ownPath, tokens.get(attacker.id)), modifiedRequest: safeRequestRecord('GET', victimPath, tokens.get(attacker.id)), originalResponse: { status: ownResponse.status, body: sanitizeEvidence(ownBody) }, modifiedResponse: { status: attackResponse.status, body: sanitizeEvidence(attackBody) }, victimBaselineRequest: safeRequestRecord('GET', victimPath, tokens.get(victim.id)), victimBaselineResponse: { status: victimResponse.status, body: sanitizeEvidence(victimBody) }, ownershipEvidence: `${owner.ownerField}=${owner.ownerId}; victim identity=${victim.id}; object=${victimId}`, authorizationViolation: `Attacker ${attacker.id} received object ${victimId} owned by ${owner.ownerId}`, confirmationChecks: ['attacker authenticated', 'victim object returned to victim in baseline request', 'attacker object baseline succeeded', 'attacker received victim object', 'response object identifier matched requested victim object', 'returned owner identifier matched victim identity'], confidence: 98 };
        const reachable: string[] = []; const downstreamObjects: Array<{ resourceId: string; objectId: string }> = [];
        for (const child of endpoint.path.split('/').filter(Boolean).length === 2 ? endpoints.filter((e) => e.method === 'get' && e.path.startsWith(`/${resourceId}s/`) && e.path.split('/').filter(Boolean).length > 2) : []) {
          const childParams = child.parameters.filter((p) => p.in === 'path');
          const childPath = templateUrl(target.baseUrl, child, Object.fromEntries(childParams.map((p) => [p.name, victimId])));
          const childResponse = await request(new URL(childPath, target.baseUrl).toString(), { headers: { Authorization: tokens.get(attacker.id)! } });
          const childBody = await asJson(childResponse);
          if (childResponse.ok && deepValuesMatch(childBody, victimId)) { const childResource = child.path.split('/').filter(Boolean).at(-1)?.toLowerCase(); const childObject = childBody && typeof childBody === 'object' && !Array.isArray(childBody) ? String((childBody as Record<string, unknown>).id ?? victimId) : victimId; if (childResource && childResource !== resourceId) { reachable.push(childResource); downstreamObjects.push({ resourceId: childResource, objectId: childObject }); } accesses.push({ identityId: attacker.id, resourceId: childResource ?? resourceId, objectId: childObject, unauthorized: true, sensitiveFields: fieldNames(childBody, parsed.resources.find((r) => r.id === childResource)) }); }
        }
        const traversed = traverseObservedRelationships(resourceId, parsed.relationships, new Set(reachable));
        const confirmedDownstream = traversed.map((step) => downstreamObjects.find((item) => item.resourceId === step.resourceId)).filter((item): item is { resourceId: string; objectId: string } => Boolean(item));
        const impact = analyzeImpact(resourceId, parsed.relationships, parsed.resources, victim.id, confirmedDownstream.length ? 1 + confirmedDownstream.reduce((max, item) => Math.max(max, traversed.find((step) => step.resourceId === item.resourceId)?.depth ?? 0), 0) : 1, confirmedDownstream.map((item) => item.resourceId));
        const pathId = `path:${findingId}`;
        attackPaths.push(buildAttackPath({ id: pathId, entryPoint: endpoint.id, attacker: attacker.id, rootResource: resourceId, rootObject: victimId, downstream: confirmedDownstream, sensitiveData: impact.sensitiveFields, evidenceIds: [evidenceId] }));
        findings.push({ id: findingId, scanId: scan.id, vulnerabilityType: 'BOLA', title: `Broken Object Level Authorization in ${endpoint.path}`, severity: reachable.length ? 'critical' : 'high', confidence: evidence.confidence, endpoint: endpoint.path, method: endpoint.method.toUpperCase(), attackerIdentity: attacker.id, victimIdentity: victim.id, affectedObject: victimId, evidenceIds: [evidenceId], attackPathId: pathId, impact, remediation: remediation('BOLA'), poc: `curl -i -X GET '${new URL(victimPath, target.baseUrl)}' -H 'Authorization: Bearer <USER_A_TOKEN>'`, createdAt: new Date().toISOString(), evidence });
        accesses.push({ identityId: attacker.id, resourceId, objectId: victimId, unauthorized: true, sensitiveFields: fieldNames(attackBody) });
      }
    }
    update('VALIDATING', 75, 'Validating returned fields against observed responses');
    if (checks.dataExposure && attacker && tokens.has(attacker.id)) {
      for (const endpoint of endpoints.filter((e) => e.method === 'get' && e.parameters.some((p) => p.in === 'path'))) {
        const resourceId = endpoint.path.split('/').filter(Boolean).find((s) => !s.startsWith('{'))?.replace(/s$/, '').toLowerCase() ?? 'resource';
        const objectId = attacker.ownedResources?.[resourceId]?.[0] ?? (resourceId === 'user' ? attacker.id : undefined);
        if (!objectId) continue;
        testedEndpointIds.add(endpoint.id);
        const path = templateUrl(target.baseUrl, endpoint, Object.fromEntries(endpoint.parameters.filter((p) => p.in === 'path').map((p) => [p.name, objectId])));
        const response = await request(new URL(path, target.baseUrl).toString(), { headers: { Authorization: tokens.get(attacker.id)! } });
        const body = await asJson(response); const exposed = fieldNames(body, parsed.resources.find((resource) => resource.id === resourceId));
        if (!response.ok || exposed.length === 0) continue;
        const evidenceId = randomUUID(); const findingId = randomUUID();
        const evidence: Evidence = { id: evidenceId, attacker: attacker.id, victim: attacker.id, originalRequest: safeRequestRecord('GET', path, tokens.get(attacker.id)), modifiedRequest: {}, originalResponse: { status: response.status, exposedFields: exposed }, modifiedResponse: { body: sanitizeEvidence(body) }, ownershipEvidence: 'Authenticated identity requested its configured own object', authorizationViolation: 'Sensitive fields were returned in the response', confirmationChecks: ['authenticated request succeeded', 'sensitive field names observed in actual response body'], confidence: 90 };
        findings.push({ id: findingId, scanId: scan.id, vulnerabilityType: 'DATA_EXPOSURE', title: `Sensitive response fields returned by ${endpoint.path}`, severity: exposed.some((field) => /(password|secret|token|card|ssn)/i.test(field)) ? 'high' : 'medium', confidence: 90, endpoint: endpoint.path, method: 'GET', attackerIdentity: attacker.id, affectedObject: objectId, evidenceIds: [evidenceId], impact: { directlyExposed: [resourceId], indirectlyReachable: [], sensitiveFields: exposed, affectedIdentities: [attacker.id], attackPathDepth: 0, privilegeDifference: 'Same identity; excessive response fields' }, remediation: remediation('DATA_EXPOSURE'), poc: `curl -i '${new URL(path, target.baseUrl)}' -H 'Authorization: Bearer <USER_TOKEN>'`, createdAt: new Date().toISOString(), evidence });
        accesses.push({ identityId: attacker.id, resourceId, objectId, sensitiveFields: exposed });
      }
    }
    // Mutating probes are opt-in and only run against an explicitly designated sandbox.
    if (target.sandboxMode && target.allowDestructiveTests && attacker && victim && tokens.has(attacker.id) && tokens.has(victim.id)) {
      for (const endpoint of (checks.bfla ? endpoints : []).filter((e) => e.method === 'post' && /\/admin\/users\/\{[^}]+\}\/role$/.test(e.path))) {
        testedEndpointIds.add(endpoint.id);
        const userId = victim.ownedResources?.user?.[0] ?? victim.id;
        const path = templateUrl(target.baseUrl, endpoint, Object.fromEntries(endpoint.parameters.filter((p) => p.in === 'path').map((p) => [p.name, userId])));
        const beforeResponse = await request(new URL(`/users/${encodeURIComponent(userId)}`, target.baseUrl).toString(), { headers: { Authorization: tokens.get(victim.id)! } });
        const before = await asJson(beforeResponse);
        const probe = { role: 'sentinel_probe' };
        const mutation = await request(new URL(path, target.baseUrl).toString(), { method: 'POST', headers: { Authorization: tokens.get(attacker.id)!, 'Content-Type': 'application/json' }, body: JSON.stringify(probe) });
        const afterResponse = await request(new URL(`/users/${encodeURIComponent(userId)}`, target.baseUrl).toString(), { headers: { Authorization: tokens.get(victim.id)! } });
        const after = await asJson(afterResponse);
        const observedRole = after && typeof after === 'object' ? String((after as Record<string, unknown>).role ?? '') : '';
        if (!mutation.ok || observedRole !== probe.role) continue;
        const id = randomUUID(); const evidenceId = randomUUID();
        const evidence: Evidence = { id: evidenceId, attacker: attacker.id, victim: victim.id, originalRequest: safeRequestRecord('GET', `/users/${userId}`, tokens.get(victim.id)), modifiedRequest: safeRequestRecord('POST', path, tokens.get(attacker.id), probe), originalResponse: { status: beforeResponse.status, body: sanitizeEvidence(before) }, modifiedResponse: { status: mutation.status, observedState: sanitizeEvidence(after) }, ownershipEvidence: `Victim ${victim.id} role changed from ${String((before as Record<string, unknown> | undefined)?.role ?? 'unknown')} to ${observedRole}`, authorizationViolation: `Role ${attacker.role} successfully invoked an administrative role-change operation`, confirmationChecks: ['authenticated low-privilege actor', 'admin-scoped endpoint invoked', 'HTTP success returned', 'follow-up read confirmed protected role changed'], confidence: 99 };
        const pathId = `path:${id}`; const impact = { directlyExposed: ['UserRole'], indirectlyReachable: [], sensitiveFields: ['role'], affectedIdentities: [victim.id], attackPathDepth: 1, privilegeDifference: `${attacker.role} changed a victim account role` };
        attackPaths.push({ id: pathId, entryPoint: endpoint.id, attacker: attacker.id, steps: [{ nodeId: `identity:${attacker.id}`, label: attacker.username, relationship: 'ATTACKER' }, { nodeId: `endpoint:${endpoint.id}`, label: endpoint.id, relationship: 'BFLA' }, { nodeId: `identity:${victim.id}`, label: `role=${observedRole}`, relationship: 'PRIVILEGE_CHANGE' }], affectedResources: ['UserRole'], sensitiveData: ['role'], depth: 2, evidenceIds: [evidenceId] });
        findings.push({ id, scanId: scan.id, vulnerabilityType: 'BFLA', title: `Broken Function Level Authorization in ${endpoint.path}`, severity: 'critical', confidence: 99, endpoint: endpoint.path, method: 'POST', attackerIdentity: attacker.id, victimIdentity: victim.id, affectedObject: userId, evidenceIds: [evidenceId], attackPathId: pathId, impact, remediation: 'Enforce endpoint-level role and permission checks on the server before applying any administrative change.', poc: `curl -i -X POST '${new URL(path, target.baseUrl)}' -H 'Authorization: Bearer <USER_A_TOKEN>' -H 'Content-Type: application/json' --data '{"role":"sentinel_probe"}'`, createdAt: new Date().toISOString(), evidence });
      }
      for (const endpoint of (checks.massAssignment ? endpoints : []).filter((e) => e.method === 'patch' && /^\/users\/\{[^}]+\}$/.test(e.path))) {
        testedEndpointIds.add(endpoint.id);
        const userId = attacker.ownedResources?.user?.[0] ?? attacker.id;
        const path = templateUrl(target.baseUrl, endpoint, Object.fromEntries(endpoint.parameters.filter((p) => p.in === 'path').map((p) => [p.name, userId])));
        const beforeResponse = await request(new URL(`/users/${encodeURIComponent(userId)}`, target.baseUrl).toString(), { headers: { Authorization: tokens.get(attacker.id)! } });
        const before = await asJson(beforeResponse);
        const probe = { role: 'sentinel_probe', is_admin: true };
        const mutation = await request(new URL(path, target.baseUrl).toString(), { method: 'PATCH', headers: { Authorization: tokens.get(attacker.id)!, 'Content-Type': 'application/json' }, body: JSON.stringify(probe) });
        const afterResponse = await request(new URL(`/users/${encodeURIComponent(userId)}`, target.baseUrl).toString(), { headers: { Authorization: tokens.get(attacker.id)! } });
        const after = await asJson(afterResponse);
        const afterRecord = after && typeof after === 'object' ? after as Record<string, unknown> : {};
        if (!mutation.ok || afterRecord.role !== probe.role || afterRecord.is_admin !== true) continue;
        const id = randomUUID(); const evidenceId = randomUUID();
        const evidence: Evidence = { id: evidenceId, attacker: attacker.id, victim: attacker.id, originalRequest: safeRequestRecord('GET', `/users/${userId}`, tokens.get(attacker.id)), modifiedRequest: safeRequestRecord('PATCH', path, tokens.get(attacker.id), probe), originalResponse: { status: beforeResponse.status, body: sanitizeEvidence(before) }, modifiedResponse: { status: mutation.status, observedState: sanitizeEvidence(after) }, ownershipEvidence: `Protected attributes changed on user object ${userId}`, authorizationViolation: 'User-controlled properties role and is_admin were persisted', confirmationChecks: ['authenticated request succeeded', 'protected properties submitted', 'follow-up read confirmed both values changed'], confidence: 99 };
        const pathId = `path:${id}`; const impact = { directlyExposed: ['User'], indirectlyReachable: [], sensitiveFields: ['role', 'is_admin'], affectedIdentities: [attacker.id], attackPathDepth: 1, privilegeDifference: 'A user set their own administrative flag' };
        attackPaths.push({ id: pathId, entryPoint: endpoint.id, attacker: attacker.id, steps: [{ nodeId: `identity:${attacker.id}`, label: attacker.username, relationship: 'ATTACKER' }, { nodeId: `endpoint:${endpoint.id}`, label: endpoint.id, relationship: 'MASS_ASSIGNMENT' }, { nodeId: `object:user:${userId}`, label: 'role and is_admin changed', relationship: 'PRIVILEGE_ESCALATION' }], affectedResources: ['User'], sensitiveData: ['role', 'is_admin'], depth: 2, evidenceIds: [evidenceId] });
        findings.push({ id, scanId: scan.id, vulnerabilityType: 'MASS_ASSIGNMENT', title: `Protected user properties are writable at ${endpoint.path}`, severity: 'critical', confidence: 99, endpoint: endpoint.path, method: 'PATCH', attackerIdentity: attacker.id, victimIdentity: attacker.id, affectedObject: userId, evidenceIds: [evidenceId], attackPathId: pathId, impact, remediation: 'Use an explicit allowlist of user-editable fields. Reject or ignore role, is_admin, tenant, and other server-controlled properties.', poc: `curl -i -X PATCH '${new URL(path, target.baseUrl)}' -H 'Authorization: Bearer <USER_A_TOKEN>' -H 'Content-Type: application/json' --data '{"role":"sentinel_probe","is_admin":true}'`, createdAt: new Date().toISOString(), evidence });
      }
    }
    // Keep authentication pressure tests small and sandbox-only. Results remain provisional.
    if (checks.rateLimiting && target.sandboxMode) {
      const statuses: number[] = []; const times: number[] = []; let signalled = false;
      const endpoint = endpoints.find((e) => e.method === 'post' && /login|auth/i.test(e.path));
      if (endpoint) testedEndpointIds.add(endpoint.id);
      if (endpoint) for (let i = 0; i < Math.min(checks.rateLimitRequests, 10); i += 1) {
        const start = Date.now(); const response = await request(new URL(endpoint.path, target.baseUrl).toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'sentinel-invalid-user', password: `invalid-${i}` }) });
        statuses.push(response.status); times.push(Date.now() - start);
        if (response.status === 429 || [...response.headers.keys()].some((key) => /^(retry-after|x-ratelimit-|ratelimit-)/i.test(key))) { signalled = true; break; }
      }
      if (endpoint && statuses.length && !signalled) {
        const id = randomUUID(); const evidenceId = randomUUID();
        const evidence: Evidence = { id: evidenceId, attacker: 'unauthenticated', victim: 'unauthenticated', originalRequest: safeRequestRecord('POST', endpoint.path, undefined, { username: 'sentinel-invalid-user', password: '[redacted]' }), modifiedRequest: {}, originalResponse: { requestCount: statuses.length, statuses, elapsedMs: times }, modifiedResponse: { rateLimitSignalObserved: false }, ownershipEvidence: 'Sandbox login endpoint responded to a bounded invalid-credential burst', authorizationViolation: 'No 429 response or standard retry/rate-limit header observed during this small sample', confirmationChecks: ['sandboxMode enabled', `sent ${statuses.length} bounded requests`, 'no HTTP 429 or standard rate-limit headers observed'], confidence: 65 };
        const impact = { directlyExposed: ['Authentication'], indirectlyReachable: [], sensitiveFields: [], affectedIdentities: [], attackPathDepth: 0, privilegeDifference: 'Unauthenticated rate-control weakness; requires follow-up validation' };
        findings.push({ id, scanId: scan.id, vulnerabilityType: 'RATE_LIMITING', title: `Potential weak rate limiting at ${endpoint.path}`, severity: 'medium', confidence: 65, endpoint: endpoint.path, method: 'POST', attackerIdentity: 'unauthenticated', evidenceIds: [evidenceId], impact, remediation: remediation('RATE_LIMITING'), poc: `curl -i -X POST '${new URL(endpoint.path, target.baseUrl)}' -H 'Content-Type: application/json' --data '{"username":"invalid","password":"invalid"}'`, createdAt: new Date().toISOString(), evidence });
      }
    }
    update('BUILDING_GRAPH', 85, 'Building authorization graph and attack paths');
    const graph = buildGraph(endpoints, parsed.resources, parsed.relationships, identities, accesses);
    for (const path of attackPaths) for (const branch of path.branches ?? []) graph.edges.push({ source: branch.steps[0].nodeId, target: branch.steps[1].nodeId, type: 'REFERENCES', label: 'Observed cross-resource access' });
    scan.findings = findings; scan.graph = graph; scan.attackPaths = attackPaths; scan.testedEndpointIds = [...testedEndpointIds];
    update('ANALYZING_IMPACT', 93, 'Calculating contextual impact');
    scan.report = { scanId: scan.id, targetId: target.id, completedAt: new Date().toISOString(), summary: { findings: findings.length, confirmedBola: findings.filter((f) => f.vulnerabilityType === 'BOLA').length, graphNodes: graph.nodes.length, graphEdges: graph.edges.length }, findings, attackPaths, graph };
    scan.completedAt = new Date().toISOString(); update('COMPLETED', 100, 'Scan completed');
  } catch (error) {
    scan.error = error instanceof Error ? error.message : 'Scan failed'; scan.status = 'FAILED'; scan.completedAt = new Date().toISOString(); store.updateScan(scan); console.error(JSON.stringify({ event: 'scan_failed', scanId: scan.id, error: scan.error }));
  } finally {
    if (target.sandboxMode && target.demoSandbox && target.allowDestructiveTests && ['localhost', '127.0.0.1', '::1'].includes(new URL(target.baseUrl).hostname.replace(/^\[|\]$/g, '').toLowerCase())) {
      try { await sandboxFetch(new URL('/__demo/reset', target.baseUrl).toString(), target.baseUrl, { method: 'POST' }); }
      catch { scan.warnings = [...(scan.warnings ?? []), 'The local demo reset request failed; verify fixture state before the next run']; }
      store.updateScan(scan);
    }
  }
}

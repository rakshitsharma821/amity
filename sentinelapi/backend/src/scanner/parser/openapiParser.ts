import { load } from 'js-yaml';
import type { Endpoint, HttpMethod, Relationship, Resource } from '../../models/types.js';

const METHODS = new Set<HttpMethod>(['get', 'post', 'put', 'patch', 'delete']);
const singular = (word: string) => word.endsWith('ies') ? `${word.slice(0, -3)}y` : word.endsWith('s') ? word.slice(0, -1) : word;
const title = (word: string) => singular(word.replace(/[^a-zA-Z0-9]/g, '')).replace(/^./, (c) => c.toUpperCase()) || 'Resource';

export function parseOpenApi(input: string | Record<string, unknown>) {
  const document = typeof input === 'string' ? load(input) as Record<string, unknown> : input;
  const version = String(document.openapi ?? '');
  if (!version.startsWith('3.')) throw new Error('Only OpenAPI 3.x documents are supported');
  const paths = document.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths || typeof paths !== 'object') throw new Error('OpenAPI document must define paths');
  const endpoints: Endpoint[] = [];
  const resources = new Map<string, Resource>();
  for (const [path, item] of Object.entries(paths)) {
    for (const [verb, raw] of Object.entries(item)) {
      if (!METHODS.has(verb as HttpMethod) || !raw || typeof raw !== 'object') continue;
      const op = raw as Record<string, unknown>;
      const pathParams = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => ({ name: m[1], in: 'path', required: true }));
      const parameters = [...(Array.isArray(item.parameters) ? item.parameters as Endpoint['parameters'] : []), ...(Array.isArray(op.parameters) ? op.parameters as Endpoint['parameters'] : []), ...pathParams];
      const responses = op.responses as Record<string, { content?: Record<string, { schema?: unknown }> }> | undefined;
      const success = Object.entries(responses ?? {}).find(([status]) => status.startsWith('2'))?.[1];
      const responseSchema = success?.content?.['application/json']?.schema;
      const requestBody = op.requestBody as { content?: Record<string, { schema?: unknown }> } | undefined;
      const requestSchema = requestBody?.content?.['application/json']?.schema;
      const security = (op.security ?? document.security ?? []) as Array<Record<string, string[]>>;
      const roles = security.flatMap((requirement) => Object.values(requirement).flat());
      const resourceSegment = path.split('/').filter((s) => s && !s.startsWith('{')).at(-1) ?? 'resource';
      const resourceName = title(resourceSegment);
      const resourceId = resourceName.toLowerCase();
      const endpoint: Endpoint = { id: `${verb.toUpperCase()} ${path}`, path, method: verb as HttpMethod, operationId: typeof op.operationId === 'string' ? op.operationId : undefined, parameters, requestSchema, responseSchema, authenticationRequired: security.length > 0, roles };
      endpoints.push(endpoint);
      if ((verb === 'get' || verb === 'post' || verb === 'patch') && !/\/(openapi|swagger|api-docs)(\.|\/|$)|\/(login|auth|token)$/i.test(path)) {
        const res = resources.get(resourceId) ?? { id: resourceId, name: resourceName, endpointIds: [], identifierFields: [], ownerFields: [], sensitiveFields: [] };
        res.endpointIds.push(endpoint.id);
        for (const match of path.matchAll(/\{([^}]+)\}/g)) if (!res.identifierFields.includes(match[1])) res.identifierFields.push(match[1]);
        const schema = resolveSchema(responseSchema, document);
        for (const key of Object.keys(schema?.properties ?? {})) {
          if (/(owner|user|tenant|account|customer).*id$/i.test(key)) res.ownerFields.push(key);
          if (/(password|secret|token|email|phone|address|card|ssn|internal|metadata)/i.test(key)) res.sensitiveFields.push(key);
        }
        resources.set(resourceId, res);
      }
    }
  }
  const resourceList = [...resources.values()];
  const relationships: Relationship[] = [];
  const resourceNames = new Map(resourceList.map((r) => [r.id, r]));
  for (const resource of resourceList) {
    for (const endpoint of endpoints.filter((e) => e.id.startsWith('GET ') && e.path.includes(`/${resource.id}`))) {
      const schema = resolveSchema(endpoint.responseSchema, document);
      for (const field of Object.keys(schema?.properties ?? {})) {
        if (!/id$/i.test(field) || /^(id|ownerid|userid|tenantid)$/i.test(field)) continue;
        const candidate = field.replace(/Id$/i, '').toLowerCase();
        const target = resourceNames.get(candidate);
        if (target && !relationships.some((edge) => edge.sourceResource === resource.id && edge.targetResource === target.id)) relationships.push({ sourceResource: resource.id, targetResource: target.id, relationshipType: 'REFERENCES', identifierMapping: `${field} -> ${candidate}.id`, confidence: 0.8 });
      }
    }
  }
  // Nested paths such as /orders/{id}/payment imply a parent -> child link.
  for (const endpoint of endpoints) {
    const segments = endpoint.path.split('/').filter(Boolean);
    const parent = segments.find((s) => !s.startsWith('{'));
    const child = segments.at(-1);
    if (segments.length > 2 && child && !child.startsWith('{') && parent && singular(parent) !== singular(child)) {
      const from = singular(parent), to = singular(child);
      if (resourceNames.has(from) && resourceNames.has(to) && !relationships.some((edge) => edge.sourceResource === from && edge.targetResource === to)) relationships.push({ sourceResource: from, targetResource: to, relationshipType: 'NESTED_ENDPOINT', identifierMapping: `${parent}.id -> ${child}`, confidence: 0.65 });
    }
  }
  return { document, endpoints, resources: resourceList, relationships };
}

function resolveSchema(schema: unknown, doc: Record<string, unknown>): Record<string, { properties?: Record<string, unknown> }> | undefined {
  if (!schema || typeof schema !== 'object') return undefined;
  const value = schema as Record<string, unknown>;
  if (typeof value.$ref === 'string') {
    const parts = value.$ref.replace(/^#\//, '').split('/');
    let current: unknown = doc;
    for (const part of parts) current = (current as Record<string, unknown>)?.[part.replace(/~1/g, '/').replace(/~0/g, '~')];
    return current as ReturnType<typeof resolveSchema>;
  }
  if (value.type === 'array' && value.items) return resolveSchema(value.items, doc);
  return value as ReturnType<typeof resolveSchema>;
}

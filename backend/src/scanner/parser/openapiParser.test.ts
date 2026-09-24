import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseOpenApi } from './openapiParser.js';

test('OpenAPI parser extracts operations, resources, sensitive fields, and inferred links', async () => {
  const specPath = fileURLToPath(new URL('../../../../sentinelapi/vulnerable-api/openapi.json', import.meta.url));
  const spec = JSON.parse(await readFile(specPath, 'utf8')) as Record<string, unknown>;
  const parsed = parseOpenApi(spec);
  assert.ok(parsed.endpoints.some((endpoint) => endpoint.id === 'GET /orders/{id}'));
  assert.ok(parsed.endpoints.some((endpoint) => endpoint.id === 'GET /orders/{id}/payment'));
  assert.ok(parsed.resources.find((resource) => resource.id === 'order')?.ownerFields.includes('user_id'));
  assert.ok(parsed.resources.find((resource) => resource.id === 'order')?.sensitiveFields.includes('card_number'));
  assert.ok(parsed.relationships.some((edge) => edge.sourceResource === 'order' && edge.targetResource === 'payment'));
});

test('OpenAPI parser rejects unsupported or malformed documents', () => {
  assert.throws(() => parseOpenApi({ openapi: '2.0', paths: {} }), /OpenAPI 3.x/);
  assert.throws(() => parseOpenApi({ openapi: '3.0.0' }), /must define paths/);
});

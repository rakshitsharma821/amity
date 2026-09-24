import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeExposure } from './exposureAnalyzer.js';

test('exposure analysis confirms configured sensitive fields only when observed', () => {
  const resource = { id: 'user', name: 'User', endpointIds: [], identifierFields: ['id'], ownerFields: [], sensitiveFields: ['internalNotes', 'address'] };
  const result = analyzeExposure({ id: 'U1', address: 'hidden', safe: true }, resource);
  assert.deepEqual(result.exposedFields, ['address']);
  assert.deepEqual(result.schemaSensitiveFields, ['address']);
});

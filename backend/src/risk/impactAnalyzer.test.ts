import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeImpact } from './impactAnalyzer.js';

test('impact report distinguishes direct and downstream resources and sensitive fields', () => {
  const resources = [
    { id: 'order', name: 'Order', endpointIds: [], identifierFields: ['id'], ownerFields: ['user_id'], sensitiveFields: [] },
    { id: 'payment', name: 'Payment', endpointIds: [], identifierFields: ['id'], ownerFields: ['user_id'], sensitiveFields: ['card_number'] },
  ];
  const impact = analyzeImpact('order', [{ sourceResource: 'order', targetResource: 'payment', relationshipType: 'REFERENCES', identifierMapping: 'payment_id', confidence: 0.9 }], resources, 'U002', 2, ['payment']);
  assert.deepEqual(impact.directlyExposed, ['Order']);
  assert.deepEqual(impact.indirectlyReachable, ['Payment']);
  assert.deepEqual(impact.sensitiveFields, ['card_number']);
  assert.equal(impact.attackPathDepth, 2);
});

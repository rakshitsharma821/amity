import test from 'node:test';
import assert from 'node:assert/strict';
import { traverseObservedRelationships } from './graphTraversal.js';
import { buildAttackPath } from './attackPathEngine.js';

test('relationship traversal follows only resources proven reachable by observations', () => {
  const relationships = [
    { sourceResource: 'order', targetResource: 'payment', relationshipType: 'REFERENCES', identifierMapping: 'payment_id', confidence: 0.9 },
    { sourceResource: 'payment', targetResource: 'processor', relationshipType: 'REFERENCES', identifierMapping: 'processor_id', confidence: 0.6 },
  ];
  const result = traverseObservedRelationships('order', relationships, new Set(['payment']));
  assert.deepEqual(result.map((item) => item.resourceId), ['payment']);
  assert.equal(result[0].depth, 1);
});

test('attack path retains the concrete downstream object identifiers', () => {
  const path = buildAttackPath({ id: 'p1', entryPoint: 'GET /orders/{id}', attacker: 'U001', rootResource: 'order', rootObject: '1002', downstream: [{ resourceId: 'payment', objectId: '502' }], sensitiveData: ['card_number'], evidenceIds: ['e1'] });
  assert.equal(path.depth, 2);
  assert.equal(path.steps[2].nodeId, 'object:payment:502');
});

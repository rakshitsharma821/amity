import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from './graphBuilder.js';

test('graph models identity, object ownership, unauthorized access, and sensitive data edges', () => {
  const graph = buildGraph([], [{ id: 'order', name: 'Order', endpointIds: [], identifierFields: ['id'], ownerFields: ['user_id'], sensitiveFields: ['card_number'] }], [], [{ id: 'U001', role: 'user' }], [{ identityId: 'U001', resourceId: 'order', objectId: '1002', unauthorized: true, sensitiveFields: ['card_number'] }]);
  assert.ok(graph.nodes.some((node) => node.id === 'object:order:1002'));
  assert.ok(graph.edges.some((edge) => edge.type === 'UNAUTHORIZED_ACCESS'));
  assert.ok(graph.nodes.some((node) => node.type === 'SENSITIVE_DATA' && node.label === 'card_number'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { findObject, validateOwnership } from './ownershipValidator.js';

test('ownership validator confirms a returned victim-owned object', () => {
  const response = { id: 1002, user_id: 'U002', payment: { id: 502 } };
  assert.equal(findObject(response, '1002')?.id, 1002);
  assert.deepEqual(validateOwnership(response, '1002', 'U002'), { confirmed: true, object: response, ownerId: 'U002', ownerField: 'user_id' });
});

test('ownership validator does not confirm unknown or attacker-owned records', () => {
  assert.equal(validateOwnership({ id: 1, user_id: 'A' }, '1', 'B').confirmed, false);
  assert.equal(validateOwnership({ id: 2 }, '2', 'B').confirmed, false);
});

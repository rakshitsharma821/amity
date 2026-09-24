import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeEvidence } from './evidenceEngine.js';

test('evidence sanitizer removes credentials and sensitive field values recursively', () => {
  const sanitized = sanitizeEvidence({ Authorization: 'Bearer supersecret', user: { email: 'alice@example.com', id: 'U001' }, card_number: '4532015698741235' }) as Record<string, unknown>;
  assert.equal(sanitized.Authorization, 'Bea…[redacted]…et');
  assert.equal((sanitized.user as Record<string, unknown>).email, 'ali…[redacted]…om');
  assert.equal(sanitized.card_number, '453…[redacted]…35');
  assert.equal((sanitized.user as Record<string, unknown>).id, 'U001');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAuthorizedTarget } from './targetSafety.js';

test('target safety rejects unconfigured remote hosts, URL credentials, paths, and query strings', async () => {
  await assert.rejects(assertAuthorizedTarget('https://example.com', false), /allowlist/);
  await assert.rejects(assertAuthorizedTarget('http://user:secret@127.0.0.1:4000', false), /without embedded credentials/);
  await assert.rejects(assertAuthorizedTarget('http://127.0.0.1:4000/api', false), /origin URL/);
  await assert.rejects(assertAuthorizedTarget('http://127.0.0.1:4000/?token=abc', false), /origin URL/);
});

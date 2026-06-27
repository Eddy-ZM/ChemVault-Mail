import test from 'node:test';
import assert from 'node:assert/strict';
import { requireInternalToken } from '../src/internal-api.js';

test('rejects missing internal gateway token', () => {
	assert.throws(() => requireInternalToken({ authorization: '' }, 'expected-token'), /Unauthorized/);
});

test('accepts matching bearer internal gateway token', () => {
	assert.equal(requireInternalToken({ authorization: 'Bearer expected-token' }, 'expected-token'), true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryAuthStore } from '../src/auth-store.js';

test('syncs, verifies, and revokes app passwords without storing plaintext', async () => {
	const store = createMemoryAuthStore();

	await store.syncAppPassword({
		id: 1,
		email: 'user@chemvault.science',
		plainAppPassword: 'abcd-efgh-2345-6789',
		scopes: ['imap', 'smtp'],
		revoked: false
	});

	const snapshot = await store.listEntries();
	assert.equal(snapshot[0].plainAppPassword, undefined);
	assert.equal(snapshot[0].passwordHash.startsWith('$2'), true);
	assert.equal(await store.verifyAppPassword('user@chemvault.science', 'abcd-efgh-2345-6789', 'smtp'), true);
	assert.equal(await store.verifyAppPassword('user@chemvault.science', 'wrong-password', 'smtp'), false);

	await store.revokeAppPassword({ id: 1, email: 'user@chemvault.science' });

	assert.equal(await store.verifyAppPassword('user@chemvault.science', 'abcd-efgh-2345-6789', 'smtp'), false);
});

test('rejects passwords when requested scope is not present', async () => {
	const store = createMemoryAuthStore();

	await store.syncAppPassword({
		id: 2,
		email: 'user@chemvault.science',
		plainAppPassword: 'abcd-efgh-2345-6789',
		scopes: ['imap'],
		revoked: false
	});

	assert.equal(await store.verifyAppPassword('user@chemvault.science', 'abcd-efgh-2345-6789', 'smtp'), false);
	assert.equal(await store.verifyAppPassword('user@chemvault.science', 'abcd-efgh-2345-6789', 'imap'), true);
});

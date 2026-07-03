import test from 'node:test';
import assert from 'node:assert/strict';
import { assertEnvelopeAllowed, sendWithResend } from '../src/smtp-policy.js';

test('allows SMTP envelope when From belongs to authenticated user', () => {
	assert.doesNotThrow(() => assertEnvelopeAllowed({
		authenticatedEmail: 'user@chemvault.science',
		from: 'user@chemvault.science',
		to: ['recipient@example.com']
	}));
});

test('rejects SMTP From address that does not belong to authenticated user', () => {
	assert.throws(() => assertEnvelopeAllowed({
		authenticatedEmail: 'user@chemvault.science',
		from: 'other@chemvault.science',
		to: ['recipient@example.com']
	}), /From address/);
});

test('rejects SMTP messages with too many recipients', () => {
	assert.throws(() => assertEnvelopeAllowed({
		authenticatedEmail: 'user@chemvault.science',
		from: 'user@chemvault.science',
		to: Array.from({ length: 21 }, (_, index) => `recipient${index}@example.com`)
	}), /Too many recipients/);
});

test('rejects dangerous attachment file types', () => {
	assert.throws(() => assertEnvelopeAllowed({
		authenticatedEmail: 'user@chemvault.science',
		from: 'user@chemvault.science',
		to: ['recipient@example.com'],
		attachments: [{ filename: 'payload.js', size: 128 }]
	}), /not allowed/);
});

test('returns a send failure when Resend API fails', async () => {
	await assert.rejects(() => sendWithResend({
		apiKey: 'test-key',
		message: {
			from: 'user@chemvault.science',
			to: ['recipient@example.com'],
			raw: 'Subject: Test\r\n\r\nBody'
		},
		fetchImpl: async () => ({
			ok: false,
			status: 500,
			text: async () => 'provider failed'
		})
	}), /Provider details suppressed/);
});

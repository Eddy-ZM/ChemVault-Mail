// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
	buildGatewaySyncPayload,
	generateAppPassword,
	normalizeAppPasswordScopes,
	toPublicAppPassword,
	validateMailGatewayURL
} from '../src/service/app-password-service.js';

describe('app password service', () => {
	it('generates Outlook-friendly one-time passwords', () => {
		const password = generateAppPassword();

		expect(password).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
	});

	it('normalizes scopes conservatively', () => {
		expect(normalizeAppPasswordScopes(['smtp', 'imap', 'admin', 'smtp'])).toEqual(['smtp', 'imap']);
		expect(normalizeAppPasswordScopes()).toEqual(['imap', 'smtp']);
	});

	it('never exposes password hashes or one-time plaintext in list responses', () => {
		const publicRecord = toPublicAppPassword({
			id: 7,
			user_id: 42,
			email_address: 'user@chemvault.science',
			name: 'Outlook',
			password_hash: 'secret-hash',
			scopes: '["imap","smtp"]',
			created_at: '2026-06-27T00:00:00.000Z',
			last_used_at: '',
			revoked_at: '',
			failed_count: 0
		});

		expect(publicRecord).toEqual({
			id: 7,
			emailAddress: 'user@chemvault.science',
			name: 'Outlook',
			scopes: ['imap', 'smtp'],
			createdAt: '2026-06-27T00:00:00.000Z',
			lastUsedAt: '',
			revokedAt: '',
			failedCount: 0,
			revoked: false
		});
		expect(publicRecord.passwordHash).toBeUndefined();
		expect(publicRecord.plainAppPassword).toBeUndefined();
	});

	it('requires HTTPS gateway sync except localhost development URLs', () => {
		expect(validateMailGatewayURL('https://smtp.chemvault.science')).toBe('https://smtp.chemvault.science');
		expect(validateMailGatewayURL('http://localhost:8789')).toBe('http://localhost:8789');
		expect(() => validateMailGatewayURL('http://smtp.chemvault.science')).toThrow(/https/i);
	});

	it('builds gateway sync payload without leaking hashes', () => {
		const payload = buildGatewaySyncPayload({
			id: 9,
			emailAddress: 'user@chemvault.science',
			plainAppPassword: 'abcd-efgh-2345-6789',
			scopes: ['imap', 'smtp']
		});

		expect(payload).toEqual({
			id: 9,
			email: 'user@chemvault.science',
			plainAppPassword: 'abcd-efgh-2345-6789',
			scopes: ['imap', 'smtp'],
			revoked: false
		});
		expect(payload.passwordHash).toBeUndefined();
	});
});

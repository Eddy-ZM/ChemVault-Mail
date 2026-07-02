// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
	buildMailClientConfig,
	buildGatewaySyncPayload,
	generateAppPassword,
	normalizeMailClientPort,
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

	it('builds complete default IMAP and SMTP client config', () => {
		const config = buildMailClientConfig({
			env: {},
			user: { email: 'Ada@chemvault.science' },
			appPasswords: []
		});

		expect(config).toMatchObject({
			email: 'ada@chemvault.science',
			credentials: {
				username: 'ada@chemvault.science',
				password: 'App Password',
				authentication: 'Normal password'
			},
			incoming: {
				protocol: 'IMAP',
				host: 'imap.chemvault.science',
				port: 993,
				security: 'SSL/TLS',
				username: 'ada@chemvault.science',
				password: 'App Password',
				authentication: 'Normal password'
			},
			outgoing: {
				protocol: 'SMTP',
				host: 'smtp.chemvault.science',
				port: 587,
				security: 'STARTTLS',
				username: 'ada@chemvault.science',
				password: 'App Password',
				authentication: 'Normal password'
			},
			appPasswords: []
		});
	});

	it('allows deployment overrides for mail client config', () => {
		const config = buildMailClientConfig({
			env: {
				MAIL_DOMAIN: 'mail.example',
				IMAP_HOST: 'imap.private.example',
				IMAP_PORT: '1993',
				IMAP_SECURITY: 'STARTTLS',
				SMTP_HOST: 'smtp.private.example',
				SMTP_PORT: '465',
				SMTP_SECURITY: 'SSL/TLS',
				SMTP_AUTH_METHOD: 'Password'
			},
			user: { email: 'user@other.example' },
			appPasswords: [{ id: 1 }]
		});

		expect(config.incoming).toMatchObject({
			host: 'imap.private.example',
			port: 1993,
			security: 'STARTTLS',
			authentication: 'Normal password'
		});
		expect(config.outgoing).toMatchObject({
			host: 'smtp.private.example',
			port: 465,
			security: 'SSL/TLS',
			authentication: 'Password'
		});
		expect(config.appPasswords).toEqual([{ id: 1 }]);
	});

	it('falls back when mail client ports are invalid', () => {
		expect(normalizeMailClientPort('abc', 993)).toBe(993);
		expect(normalizeMailClientPort('70000', 587)).toBe(587);
		expect(normalizeMailClientPort('2525', 587)).toBe(2525);
	});
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
	EXTERNAL_ACCESS_PERM_KEYS,
	accessEmailFromHeaders,
	accessEmailFromJwt,
	createExternalAccessUser,
	isInternalAccessEmail,
	normalizeExternalAccessPermKeys,
	normalizeAccessEmail
} from '../src/security/cloudflare-access.js';

const accessEnv = {
	cloudflare_access_team_domain: 'team.cloudflareaccess.com',
	cloudflare_access_aud: 'app-aud'
};
const accessIssuer = 'https://team.cloudflareaccess.com';

const encoder = new TextEncoder();

function encodeJson(value) {
	return btoa(JSON.stringify(value))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

function encodeBytes(value) {
	return btoa(String.fromCharCode(...new Uint8Array(value)))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

async function makeAccessJwt(payload = {}, { kid = 'test-key' } = {}) {
	const keyPair = await crypto.subtle.generateKey(
		{
			name: 'RSASSA-PKCS1-v1_5',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256'
		},
		true,
		['sign', 'verify']
	);
	const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
	jwk.kid = kid;
	jwk.alg = 'RS256';
	jwk.use = 'sig';

	const now = Math.floor(Date.now() / 1000);
	const headerB64 = encodeJson({ alg: 'RS256', typ: 'JWT', kid });
	const payloadB64 = encodeJson({
		iss: accessIssuer,
		aud: [accessEnv.cloudflare_access_aud],
		exp: now + 60,
		email: 'Alice@Example.COM',
		...payload
	});
	const data = `${headerB64}.${payloadB64}`;
	const signature = await crypto.subtle.sign(
		{ name: 'RSASSA-PKCS1-v1_5' },
		keyPair.privateKey,
		encoder.encode(data)
	);

	return {
		jwt: `${data}.${encodeBytes(signature)}`,
		fetcher: async () => Response.json({ keys: [jwk] })
	};
}

describe('Cloudflare Access auth helpers', () => {
	it('validates and normalizes the email from the signed Access JWT before the email header', async () => {
		const { jwt, fetcher } = await makeAccessJwt();
		const headers = new Headers({
			'Cf-Access-Jwt-Assertion': jwt,
			'Cf-Access-Authenticated-User-Email': 'spoof@example.net'
		});

		expect(await accessEmailFromHeaders((name) => headers.get(name), accessEnv, fetcher)).toBe('alice@example.com');
	});

	it('does not trust the unsigned Cloudflare Access email header by itself', async () => {
		const headers = new Headers({
			'Cf-Access-Authenticated-User-Email': ' Visitor@External.COM '
		});

		expect(await accessEmailFromHeaders((name) => headers.get(name), accessEnv)).toBeNull();
	});

	it('rejects Access JWTs with the wrong audience', async () => {
		const { jwt, fetcher } = await makeAccessJwt({ aud: ['wrong-aud'] });

		expect(await accessEmailFromJwt(jwt, accessEnv, fetcher)).toBeNull();
	});

	it('classifies configured domains and the admin mailbox as internal identities', () => {
		expect(isInternalAccessEmail('owner@example.com', ['example.com'], 'admin@example.net')).toBe(true);
		expect(isInternalAccessEmail('owner@example.com', '["@example.com"]', 'admin@example.net')).toBe(true);
		expect(isInternalAccessEmail('admin@example.net', ['example.com'], 'admin@example.net')).toBe(true);
		expect(isInternalAccessEmail('guest@outside.test', ['example.com'], 'admin@example.net')).toBe(false);
	});

	it('creates an external Access user with the configured role permission keys', () => {
		const user = createExternalAccessUser('Guest@Outside.test', ['all-email:query', 'all-email:delete', 'email:send']);

		expect(user.email).toBe('guest@outside.test');
		expect(user.externalAccess).toBe(true);
		expect(user.readOnly).toBe(false);
		expect(user.permKeys).toEqual(['all-email:query', 'all-email:delete', 'email:send']);
	});

	it('keeps a configured empty external Access role as no permissions', () => {
		const user = createExternalAccessUser('Guest@Outside.test', []);

		expect(user.readOnly).toBe(true);
		expect(user.permKeys).toEqual([]);
	});

	it('normalizes configurable external Access permissions without dropping write permissions', () => {
		expect(normalizeExternalAccessPermKeys('all-email:query,email:send,all-email:delete,unknown')).toEqual([
			'all-email:query',
			'email:send',
			'all-email:delete'
		]);
		expect(normalizeExternalAccessPermKeys(['all-email:query', 'email:send'])).toEqual(['all-email:query', 'email:send']);
		expect(normalizeExternalAccessPermKeys('')).toEqual(EXTERNAL_ACCESS_PERM_KEYS);
	});

	it('normalizes invalid or empty email input to null', () => {
		expect(normalizeAccessEmail('')).toBeNull();
		expect(normalizeAccessEmail('not-an-email')).toBeNull();
		expect(normalizeAccessEmail(null)).toBeNull();
	});
});

import BizError from '../error/biz-error';
import saltHashUtils from '../utils/crypto-utils';
import { ensureMailClientTables } from './mail-client-schema-service';

const allowedScopes = ['imap', 'smtp'];
const appPasswordAlphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
const defaultMailDomain = 'chemvault.science';
const defaultAuthMethod = 'Normal password';
const defaultCredentialPassword = 'App Password';

export function generateAppPassword() {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	const chars = Array.from(bytes, value => appPasswordAlphabet[value % appPasswordAlphabet.length]);
	return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}-${chars.slice(12, 16).join('')}`;
}

export function normalizeAppPasswordScopes(scopes = ['imap', 'smtp']) {
	const input = Array.isArray(scopes) && scopes.length > 0 ? scopes : ['imap', 'smtp'];
	return [...new Set(input)].filter(scope => allowedScopes.includes(scope));
}

export function toPublicAppPassword(row) {
	const scopes = parseScopes(row.scopes);
	return {
		id: row.id,
		emailAddress: row.email_address,
		name: row.name,
		scopes,
		createdAt: row.created_at,
		lastUsedAt: row.last_used_at || '',
		revokedAt: row.revoked_at || '',
		failedCount: Number(row.failed_count || 0),
		revoked: Boolean(row.revoked_at)
	};
}

export function validateMailGatewayURL(value) {
	const url = new URL(value);
	const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
	if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalhost)) {
		throw new BizError('MAIL_GATEWAY_URL must use HTTPS except localhost development URLs', 500);
	}
	url.pathname = url.pathname.replace(/\/+$/, '');
	return url.toString().replace(/\/$/, '');
}

export function buildGatewaySyncPayload({ id, emailAddress, plainAppPassword, scopes, revoked = false }) {
	return {
		id,
		email: emailAddress,
		plainAppPassword,
		scopes: normalizeAppPasswordScopes(scopes),
		revoked
	};
}

export function buildMailClientConfig({ env = {}, user, appPasswords = [] }) {
	const email = normalizeEmail(user?.email);
	const mailDomain = firstNonBlank(env.MAIL_DOMAIN, domainFromEmail(email), defaultMailDomain);
	const username = email || user?.email || '';

	return {
		email: username,
		credentials: {
			username,
			password: defaultCredentialPassword,
			authentication: firstNonBlank(env.MAIL_CLIENT_AUTH_METHOD, defaultAuthMethod)
		},
		incoming: buildMailClientEndpoint({
			protocol: 'IMAP',
			host: firstNonBlank(env.IMAP_HOST, `imap.${mailDomain}`),
			port: env.IMAP_PORT,
			defaultPort: 993,
			security: firstNonBlank(env.IMAP_SECURITY, 'SSL/TLS'),
			username,
			authMethod: env.IMAP_AUTH_METHOD || env.MAIL_CLIENT_AUTH_METHOD
		}),
		outgoing: buildMailClientEndpoint({
			protocol: 'SMTP',
			host: firstNonBlank(env.SMTP_HOST, `smtp.${mailDomain}`),
			port: env.SMTP_PORT,
			defaultPort: 587,
			security: firstNonBlank(env.SMTP_SECURITY, 'STARTTLS'),
			username,
			authMethod: env.SMTP_AUTH_METHOD || env.MAIL_CLIENT_AUTH_METHOD
		}),
		appPasswords
	};
}

export function normalizeMailClientPort(value, fallback) {
	const port = Number(value);
	if (Number.isInteger(port) && port > 0 && port <= 65535) {
		return port;
	}
	return fallback;
}

async function hashAppPassword(c, plainAppPassword) {
	const salt = saltHashUtils.generateSalt();
	const pepper = c.env.APP_PASSWORD_HASH_SECRET || c.env.jwt_secret || '';
	const hash = await saltHashUtils.genHashPassword(`${pepper}:${plainAppPassword}`, salt);
	return JSON.stringify({ scheme: 'sha256-salted-v1', salt, hash });
}

function parseScopes(scopes) {
	if (Array.isArray(scopes)) {
		return normalizeAppPasswordScopes(scopes);
	}
	try {
		return normalizeAppPasswordScopes(JSON.parse(scopes || '[]'));
	} catch {
		return [];
	}
}

async function syncGateway(c, path, payload) {
	if (!c.env.MAIL_GATEWAY_URL || !c.env.INTERNAL_MAIL_GATEWAY_TOKEN) {
		return { skipped: true };
	}

	const baseURL = validateMailGatewayURL(c.env.MAIL_GATEWAY_URL);
	const response = await fetch(`${baseURL}${path}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${c.env.INTERNAL_MAIL_GATEWAY_TOKEN}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		throw new BizError(`Mail gateway sync failed with ${response.status}`, 502);
	}

	return response.json().catch(() => ({ ok: true }));
}

const appPasswordService = {
	async list(c, userId) {
		await ensureMailClientTables(c);
		const rows = await c.env.db.prepare(`
			SELECT id, email_address, name, scopes, created_at, last_used_at, revoked_at, failed_count
			FROM mail_app_passwords
			WHERE user_id = ?
			ORDER BY created_at DESC, id DESC
		`).bind(userId).all();

		return (rows.results || []).map(toPublicAppPassword);
	},

	async config(c, user) {
		return buildMailClientConfig({
			env: c.env,
			user,
			appPasswords: await this.list(c, user.userId)
		});
	},

	async create(c, params, user) {
		await ensureMailClientTables(c);
		const name = String(params.name || '').trim();
		if (!name) {
			throw new BizError('App password name is required');
		}
		if (name.length > 80) {
			throw new BizError('App password name is too long');
		}

		const scopes = normalizeAppPasswordScopes(params.scopes);
		if (scopes.length === 0) {
			throw new BizError('At least one mail client scope is required');
		}

		const plainAppPassword = generateAppPassword();
		const passwordHash = await hashAppPassword(c, plainAppPassword);
		const now = new Date().toISOString();
		const record = await c.env.db.prepare(`
			INSERT INTO mail_app_passwords (
				user_id, email_address, name, password_hash, scopes, created_at, failed_count
			) VALUES (?, ?, ?, ?, ?, ?, 0)
			RETURNING id, user_id, email_address, name, scopes, created_at, last_used_at, revoked_at, failed_count
		`).bind(user.userId, user.email, name, passwordHash, JSON.stringify(scopes), now).first();

		const payload = buildGatewaySyncPayload({
			id: record.id,
			emailAddress: record.email_address,
			plainAppPassword,
			scopes
		});

		try {
			await syncGateway(c, '/internal/app-passwords/sync', payload);
		} catch (error) {
			await c.env.db.prepare(`
				UPDATE mail_app_passwords SET revoked_at = ? WHERE id = ? AND user_id = ?
			`).bind(new Date().toISOString(), record.id, user.userId).run();
			throw error;
		}

		return {
			...toPublicAppPassword(record),
			plainAppPassword
		};
	},

	async revoke(c, id, user) {
		await ensureMailClientTables(c);
		const record = await c.env.db.prepare(`
			SELECT id, user_id, email_address, name, scopes, created_at, last_used_at, revoked_at, failed_count
			FROM mail_app_passwords
			WHERE id = ? AND user_id = ?
		`).bind(Number(id), user.userId).first();

		if (!record) {
			throw new BizError('App password not found', 404);
		}

		const revokedAt = record.revoked_at || new Date().toISOString();
		await c.env.db.prepare(`
			UPDATE mail_app_passwords SET revoked_at = ? WHERE id = ? AND user_id = ?
		`).bind(revokedAt, record.id, user.userId).run();

		await syncGateway(c, '/internal/app-passwords/revoke', {
			id: record.id,
			email: record.email_address
		});

		return toPublicAppPassword({ ...record, revoked_at: revokedAt });
	}
};

function buildMailClientEndpoint({ protocol, host, port, defaultPort, security, username, authMethod }) {
	return {
		protocol,
		host,
		port: normalizeMailClientPort(port, defaultPort),
		security,
		username,
		password: defaultCredentialPassword,
		authentication: firstNonBlank(authMethod, defaultAuthMethod)
	};
}

function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase();
}

function domainFromEmail(email) {
	const atIndex = email.lastIndexOf('@');
	if (atIndex < 0 || atIndex === email.length - 1) {
		return '';
	}
	return email.slice(atIndex + 1);
}

function firstNonBlank(...values) {
	for (const value of values) {
		const normalized = String(value || '').trim();
		if (normalized) {
			return normalized;
		}
	}
	return '';
}

export default appPasswordService;

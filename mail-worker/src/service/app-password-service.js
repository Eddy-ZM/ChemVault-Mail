import BizError from '../error/biz-error';
import saltHashUtils from '../utils/crypto-utils';

const allowedScopes = ['imap', 'smtp'];
const appPasswordAlphabet = 'abcdefghijkmnopqrstuvwxyz23456789';

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
		const rows = await c.env.db.prepare(`
			SELECT id, email_address, name, scopes, created_at, last_used_at, revoked_at, failed_count
			FROM mail_app_passwords
			WHERE user_id = ?
			ORDER BY created_at DESC, id DESC
		`).bind(userId).all();

		return (rows.results || []).map(toPublicAppPassword);
	},

	async config(c, user) {
		return {
			email: user.email,
			incoming: {
				protocol: 'IMAP',
				host: c.env.IMAP_HOST || `imap.${c.env.MAIL_DOMAIN || 'chemvault.science'}`,
				port: 993,
				security: 'SSL/TLS',
				username: user.email
			},
			outgoing: {
				protocol: 'SMTP',
				host: c.env.SMTP_HOST || `smtp.${c.env.MAIL_DOMAIN || 'chemvault.science'}`,
				port: Number(c.env.SMTP_PORT || 587),
				security: 'STARTTLS',
				username: user.email
			},
			appPasswords: await this.list(c, user.userId)
		};
	},

	async create(c, params, user) {
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

export default appPasswordService;

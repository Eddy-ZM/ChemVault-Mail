export const ACCESS_AUTH_TYPE = {
	JWT: 'jwt',
	CLOUDFLARE_ACCESS: 'cloudflare-access'
};

export const ACCESS_JWT_HEADER = 'Cf-Access-Jwt-Assertion';
export const ACCESS_EMAIL_HEADER = 'Cf-Access-Authenticated-User-Email';
export const EXTERNAL_ACCESS_USER_ID = 0;
export const EXTERNAL_ACCESS_PERM_KEYS = ['all-email:query'];
export const READ_ONLY_EXTERNAL_ACCESS_PERM_KEYS = ['all-email:query'];

const EXTERNAL_ROLE = {
	name: 'external-viewer',
	sendCount: 0,
	sendType: 'ban',
	accountCount: 0
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function normalizeAccessEmail(email) {
	if (typeof email !== 'string') {
		return null;
	}

	const value = email.trim().toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
		return null;
	}

	return value;
}

export async function accessEmailFromHeaders(getHeader, env = {}, fetcher = fetch) {
	const accessJwt = getHeader(ACCESS_JWT_HEADER);
	return accessEmailFromJwt(accessJwt, env, fetcher);
}

export async function accessEmailFromJwt(jwt, env = {}, fetcher = fetch) {
	const payload = await verifyAccessJwt(jwt, env, fetcher);
	return normalizeAccessEmail(payload?.email);
}

export async function verifyAccessJwt(jwt, env = {}, fetcher = fetch) {
	if (typeof jwt !== 'string') {
		return null;
	}

	const accessConfig = getAccessConfig(env);
	if (!accessConfig) {
		return null;
	}

	try {
		const [headerB64, payloadB64, signatureB64] = jwt.split('.');
		if (!headerB64 || !payloadB64 || !signatureB64) {
			return null;
		}

		const header = JSON.parse(base64UrlDecode(headerB64));
		const payload = JSON.parse(base64UrlDecode(payloadB64));

		if (header.alg !== 'RS256' || !header.kid) {
			return null;
		}

		if (!isValidAccessPayload(payload, accessConfig)) {
			return null;
		}

		const jwk = await fetchAccessJwk(accessConfig, header.kid, fetcher);
		if (!jwk) {
			return null;
		}

		const publicKey = await crypto.subtle.importKey(
			'jwk',
			jwk,
			{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
			false,
			['verify']
		);

		const verified = await crypto.subtle.verify(
			{ name: 'RSASSA-PKCS1-v1_5' },
			publicKey,
			base64UrlDecodeBytes(signatureB64),
			encoder.encode(`${headerB64}.${payloadB64}`)
		);

		return verified ? payload : null;
	} catch (err) {
		return null;
	}
}

export function isInternalAccessEmail(email, domains = [], adminEmail = '') {
	const normalizedEmail = normalizeAccessEmail(email);
	if (!normalizedEmail) {
		return false;
	}

	const normalizedAdmin = normalizeAccessEmail(adminEmail);
	if (normalizedAdmin && normalizedEmail === normalizedAdmin) {
		return true;
	}

	const domain = normalizedEmail.split('@')[1];
	return normalizeDomains(domains).includes(domain);
}

export function normalizeExternalAccessPermKeys(value) {
	const values = Array.isArray(value) ? value : String(value || '').split(',');
	const keys = values
		.map(item => String(item).trim())
		.filter(item => READ_ONLY_EXTERNAL_ACCESS_PERM_KEYS.includes(item));
	const uniqueKeys = [...new Set(keys)];
	return uniqueKeys.length > 0 ? uniqueKeys : [...EXTERNAL_ACCESS_PERM_KEYS];
}

export function createExternalAccessUser(email, permKeys = EXTERNAL_ACCESS_PERM_KEYS) {
	const normalizedEmail = normalizeAccessEmail(email);
	const name = normalizedEmail?.split('@')[0] || 'external';
	const externalPermKeys = normalizeExternalAccessPermKeys(permKeys);

	return {
		userId: EXTERNAL_ACCESS_USER_ID,
		email: normalizedEmail,
		name,
		sendCount: 0,
		type: 'external',
		authType: ACCESS_AUTH_TYPE.CLOUDFLARE_ACCESS,
		externalAccess: true,
		readOnly: true,
		account: {
			accountId: 0,
			userId: EXTERNAL_ACCESS_USER_ID,
			email: normalizedEmail,
			name
		},
		role: { ...EXTERNAL_ROLE },
		permKeys: externalPermKeys
	};
}

export function isExternalWriteBlocked(path, method) {
	if (path.startsWith('/logout')) {
		return false;
	}

	const normalizedMethod = String(method || '').toUpperCase();
	return !['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod);
}

function normalizeDomains(domains) {
	let domainList = domains;
	if (!Array.isArray(domainList)) {
		const value = String(domains || '');
		try {
			const parsed = JSON.parse(value);
			domainList = Array.isArray(parsed) ? parsed : value.split(',');
		} catch (err) {
			domainList = value.split(',');
		}
	}

	return domainList
		.map(domain => String(domain).trim().replace(/^@/, '').toLowerCase())
		.filter(Boolean);
}

function getAccessConfig(env = {}) {
	const teamDomain = normalizeTeamDomain(
		env.cloudflare_access_team_domain ||
		env.cloudflareAccessTeamDomain ||
		env.CLOUDFLARE_ACCESS_TEAM_DOMAIN ||
		env.TEAM_DOMAIN
	);
	const aud = normalizeAccessAud(
		env.cloudflare_access_aud ||
		env.cloudflareAccessAud ||
		env.CLOUDFLARE_ACCESS_AUD ||
		env.POLICY_AUD
	);

	if (!teamDomain || !aud) {
		return null;
	}

	const issuer = `https://${teamDomain}`;
	return {
		aud,
		issuer,
		certsUrl: `${issuer}/cdn-cgi/access/certs`
	};
}

function normalizeTeamDomain(value) {
	if (typeof value !== 'string') {
		return null;
	}

	return value
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/+$/, '')
		.toLowerCase() || null;
}

function normalizeAccessAud(value) {
	if (typeof value !== 'string') {
		return null;
	}

	return value.trim() || null;
}

function isValidAccessPayload(payload, accessConfig) {
	if (!payload || payload.iss !== accessConfig.issuer) {
		return false;
	}

	const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
	if (!aud.includes(accessConfig.aud)) {
		return false;
	}

	const now = Math.floor(Date.now() / 1000);
	if (payload.exp && payload.exp < now) {
		return false;
	}
	if (payload.nbf && payload.nbf > now) {
		return false;
	}

	return Boolean(normalizeAccessEmail(payload.email));
}

async function fetchAccessJwk(accessConfig, kid, fetcher) {
	const response = await fetcher(accessConfig.certsUrl);
	if (!response.ok) {
		return null;
	}

	const jwks = await response.json();
	return jwks?.keys?.find(key => key.kid === kid) || null;
}

function base64UrlDecode(value) {
	let normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	while (normalized.length % 4) {
		normalized += '=';
	}

	return decoder.decode(base64UrlDecodeBytes(normalized));
}

function base64UrlDecodeBytes(value) {
	let normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	while (normalized.length % 4) {
		normalized += '=';
	}

	const binary = atob(normalized);
	return Uint8Array.from(binary, char => char.charCodeAt(0));
}

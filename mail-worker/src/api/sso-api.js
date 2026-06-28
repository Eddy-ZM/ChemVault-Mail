import app from '../hono/hono';
import result from '../model/result';
import userContext from '../security/user-context';
import userService from '../service/user-service';
import accountService from '../service/account-service';
import roleService from '../service/role-service';
import cryptoUtils from '../utils/crypto-utils';
import { isDel, userConst } from '../const/entity-const';

const USER_CENTER_CLIENT_ID = 'chemvault_user';
const USER_CENTER_CALLBACK_PATH = '/api/auth/sso/mail/callback';
const DEFAULT_USER_CENTER_ORIGIN = 'https://user.chemvault.science';
const ALLOWED_RETURN_HOSTS = new Set([
	'user.chemvault.science',
	'app.chemvault.science',
	'extract.chemvault.science',
	'file.chemvault.science',
	'files.chemvault.science',
	'docs.chemvault.science',
	'model.chemvault.science',
	'molecule.chemvault.science',
	'notif.chemvault.science',
	'chemvault.science'
]);
const ALLOWED_LOCAL_RETURN_HOSTS = new Set(['localhost', '127.0.0.1']);
const ALLOWED_PAGES_PREVIEW_SUFFIXES = [
	'.chemvault-files.pages.dev',
	'.chemvault-user.pages.dev',
	'.chemvault-app.pages.dev',
	'.chemvault-docs.pages.dev'
];

app.get('/sso/chemvault-user/authorize', async (c) => {
	const url = new URL(c.req.url);
	const params = {
		clientId: url.searchParams.get('client_id') || USER_CENTER_CLIENT_ID,
		redirectUri: url.searchParams.get('redirect_uri') || `${DEFAULT_USER_CENTER_ORIGIN}${USER_CENTER_CALLBACK_PATH}`,
		returnTo: sanitizeReturnTo(url.searchParams.get('return_to'))
	};

	return c.html(renderAuthorizePage(params));
});

app.post('/sso/chemvault-user/assertion', async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const clientId = body.clientId || body.client_id || USER_CENTER_CLIENT_ID;
	const redirectUri = body.redirectUri || body.redirect_uri || '';
	const returnTo = sanitizeReturnTo(body.returnTo || body.return_to);

	if (clientId !== USER_CENTER_CLIENT_ID) {
		return c.json(result.fail('Invalid SSO client.', 400));
	}

	const callbackUrl = validateUserCenterCallback(c, redirectUri);
	const user = userContext.getUser(c);
	const email = normalizeEmail(user.email);
	const name = (user.name || email.split('@')[0] || email).trim();
	const mailUserId = String(user.userId);
	const iat = String(Date.now());
	const nonce = crypto.randomUUID ? crypto.randomUUID() : randomNonce();
	const secret = getSsoSecret(c);
	const signature = await signMailSsoAssertion(secret, { email, name, mailUserId, iat, nonce });

	callbackUrl.searchParams.set('email', email);
	callbackUrl.searchParams.set('name', name);
	callbackUrl.searchParams.set('mailUserId', mailUserId);
	callbackUrl.searchParams.set('iat', iat);
	callbackUrl.searchParams.set('nonce', nonce);
	callbackUrl.searchParams.set('signature', signature);
	callbackUrl.searchParams.set('returnTo', returnTo);

	return c.json(result.ok({ redirectUrl: callbackUrl.toString() }));
});

app.post('/internal/user-center/password-login', async (c) => {
	if (!await verifyInternalSecret(c)) {
		return c.json(result.fail('Invalid internal secret.', 403), 403);
	}

	const body = await c.req.json().catch(() => ({}));
	const email = normalizeEmail(body.email);
	const password = typeof body.password === 'string' ? body.password : '';
	if (!email || !password) {
		return c.json(result.fail('Invalid email or password.', 401), 401);
	}

	const userRow = await userService.selectByEmailIncludeDel(c, email);
	if (!userRow || userRow.isDel === isDel.DELETE || userRow.status === userConst.status.BAN) {
		return c.json(result.fail('Invalid email or password.', 401), 401);
	}

	const ok = await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password);
	if (!ok) {
		return c.json(result.fail('Invalid email or password.', 401), 401);
	}

	const accountRow = await accountService.selectByEmailIncludeDel(c, userRow.email);
	const roleRow = await roleService.selectById(c, userRow.type);
	const canSend = await resolveCanSend(c, userRow);
	const displayName = accountRow?.name || userRow.email.split('@')[0] || userRow.email;

	return c.json(result.ok({
		email: normalizeEmail(userRow.email),
		name: displayName,
		mailUserId: String(userRow.userId),
		mailAddress: normalizeEmail(userRow.email),
		mailRole: resolveMailRole(c, userRow.email, roleRow),
		mailStatus: 'active',
		canSend,
		canReceive: true,
		canLoginMail: true,
		mailboxQuotaMb: 1024,
		aliases: []
	}));
});

function validateUserCenterCallback(c, redirectUri) {
	let url;
	try {
		url = new URL(redirectUri);
	} catch {
		throw new Error('Invalid SSO redirect URI.');
	}

	const configuredOrigin = String(c.env.chemvault_user_origin || DEFAULT_USER_CENTER_ORIGIN).replace(/\/$/, '');
	const allowedOrigins = new Set([
		configuredOrigin,
		DEFAULT_USER_CENTER_ORIGIN,
		'http://localhost:8788',
		'http://localhost:5173'
	]);

	const isPagesPreview = url.protocol === 'https:' && url.hostname.endsWith('.chemvault-user.pages.dev');
	if (!allowedOrigins.has(url.origin) && !isPagesPreview) {
		throw new Error('SSO redirect origin is not allowed.');
	}

	if (url.pathname !== USER_CENTER_CALLBACK_PATH) {
		throw new Error('SSO redirect path is not allowed.');
	}

	return url;
}

function getSsoSecret(c) {
	const secret = c.env.mail_sso_secret || c.env.MAIL_SYSTEM_SSO_SECRET;
	if (!secret) {
		throw new Error('Mail SSO secret is not configured.');
	}
	return secret;
}

async function verifyInternalSecret(c) {
	const authorization = c.req.header('authorization') || '';
	const bearer = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
	const actual = c.req.header('x-chemvault-sync-secret') || c.req.header('x-chemvault-sso-secret') || bearer;
	if (!actual) return false;

	const candidates = [
		c.env.user_system_sync_secret,
		c.env.USER_SYSTEM_SYNC_SECRET,
		c.env.MAIL_SYSTEM_SYNC_SECRET,
		c.env.mail_sso_secret,
		c.env.MAIL_SYSTEM_SSO_SECRET
	].filter(Boolean);

	for (const candidate of candidates) {
		if (await timingSafeStringEqual(actual, String(candidate))) return true;
	}
	return false;
}

function resolveMailRole(c, email, roleRow) {
	if (normalizeEmail(c.env.admin || '') === normalizeEmail(email)) return 'mailbox_super';

	const marker = `${roleRow?.key || ''} ${roleRow?.name || ''}`.toLowerCase();
	if (marker.includes('super')) return 'mailbox_super';
	if (marker.includes('admin')) return 'mailbox_admin';
	return 'mailbox_user';
}

async function resolveCanSend(c, userRow) {
	if (normalizeEmail(c.env.admin || '') === normalizeEmail(userRow.email)) return true;
	const rows = await roleService.selectByIdsHasPermKey(c, [userRow.type], 'email:send');
	return rows.length > 0;
}

async function timingSafeStringEqual(a, b) {
	const [aHash, bHash] = await Promise.all([sha256Bytes(a), sha256Bytes(b)]);
	if (aHash.byteLength !== bHash.byteLength) return false;
	let diff = 0;
	for (let index = 0; index < aHash.byteLength; index += 1) {
		diff |= aHash[index] ^ bHash[index];
	}
	return diff === 0;
}

async function sha256Bytes(value) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return new Uint8Array(digest);
}

async function signMailSsoAssertion(secret, input) {
	const canonical = [
		normalizeEmail(input.email),
		input.mailUserId || '',
		input.name.trim(),
		input.iat,
		input.nonce
	].join('\n');
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonical));
	return toBase64Url(new Uint8Array(signature));
}

function renderAuthorizePage(params) {
	const payload = escapeScriptJson(JSON.stringify(params));
	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ChemVault Mail SSO</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }
    main {
      width: min(420px, calc(100vw - 32px));
      border: 1px solid #dbe4ee;
      border-radius: 8px;
      background: rgba(255,255,255,.94);
      padding: 28px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, .10);
    }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0 0 18px; color: #475569; line-height: 1.55; }
    a, button {
      display: inline-flex;
      min-height: 40px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 8px;
      background: #0f766e;
      color: white;
      padding: 0 14px;
      font: inherit;
      text-decoration: none;
      cursor: pointer;
    }
    .muted { color: #64748b; font-size: 13px; }
    .error { color: #b91c1c; }
  </style>
</head>
<body>
  <main>
    <h1>ChemVault Mail SSO</h1>
    <p id="status">Preparing secure sign-in for ChemVault User Center.</p>
    <p class="muted">This page uses your existing ChemVault Mail session. Your mail token is not sent to User Center.</p>
    <p id="action"></p>
  </main>
  <script type="application/json" id="sso-payload">${payload}</script>
  <script>
    const payload = JSON.parse(document.getElementById('sso-payload').textContent);
    const statusEl = document.getElementById('status');
    const actionEl = document.getElementById('action');
    const token = localStorage.getItem('token');
    const loginUrl = new URL('/login', location.origin);
    loginUrl.searchParams.set('sso', 'chemvault-user');
    loginUrl.searchParams.set('client_id', payload.clientId);
    loginUrl.searchParams.set('redirect_uri', payload.redirectUri);
    loginUrl.searchParams.set('return_to', payload.returnTo);

    if (!token) {
      statusEl.textContent = 'Please sign in to ChemVault Mail to continue ChemVault SSO.';
      actionEl.innerHTML = '<a id="mail-login-link">Open Mail Login</a>';
      document.getElementById('mail-login-link').href = loginUrl.pathname + loginUrl.search;
    } else {
      fetch('/api/sso/chemvault-user/assertion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(payload)
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.code !== 200 || !data.data?.redirectUrl) {
          throw new Error(data.message || 'SSO could not be completed.');
        }
        location.replace(data.data.redirectUrl);
      }).catch((error) => {
        statusEl.textContent = error.message;
        statusEl.className = 'error';
        actionEl.innerHTML = '<button type="button" onclick="location.reload()">Try again</button>';
      });
    }
  </script>
</body>
</html>`;
}

function sanitizeReturnTo(value) {
	if (!value || typeof value !== 'string') return '/dashboard';
	if (value.startsWith('/') && !value.startsWith('//')) return value;
	try {
		const url = new URL(value);
		if (url.protocol === 'https:' && (ALLOWED_RETURN_HOSTS.has(url.hostname) || isAllowedPagesPreviewHost(url.hostname))) {
			return url.toString();
		}
		if ((url.protocol === 'http:' || url.protocol === 'https:') && ALLOWED_LOCAL_RETURN_HOSTS.has(url.hostname)) {
			return url.toString();
		}
	} catch {
		return '/dashboard';
	}
	return '/dashboard';
}

function isAllowedPagesPreviewHost(hostname) {
	return ALLOWED_PAGES_PREVIEW_SUFFIXES.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix));
}

function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase();
}

function randomNonce() {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return toBase64Url(bytes);
}

function toBase64Url(bytes) {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function escapeScriptJson(value) {
	return value
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}

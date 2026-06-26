import app from '../hono/hono';
import result from '../model/result';
import userContext from '../security/user-context';

const USER_CENTER_CLIENT_ID = 'chemvault_user';
const USER_CENTER_CALLBACK_PATH = '/api/auth/sso/mail/callback';
const DEFAULT_USER_CENTER_ORIGIN = 'https://user.chemvault.science';

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

    if (!token) {
      statusEl.textContent = 'Please sign in to ChemVault Mail first, then start SSO again from User Center.';
      actionEl.innerHTML = '<a href="/login">Open Mail Login</a>';
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
	if (!value || typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
		return '/dashboard';
	}
	return value;
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

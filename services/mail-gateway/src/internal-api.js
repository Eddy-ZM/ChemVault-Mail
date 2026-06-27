export function requireInternalToken(headers, expectedToken) {
	if (!expectedToken) {
		throw Object.assign(new Error('INTERNAL_MAIL_GATEWAY_TOKEN is not configured'), { statusCode: 500 });
	}
	const authorization = headers.authorization || headers.Authorization || '';
	if (authorization !== `Bearer ${expectedToken}`) {
		throw Object.assign(new Error('Unauthorized internal request'), { statusCode: 401 });
	}
	return true;
}

export async function handleInternalRequest({ request, config, authStore }) {
	requireInternalToken(Object.fromEntries(request.headers.entries()), config.internalToken);
	const url = new URL(request.url);
	const body = await request.json();

	if (url.pathname === '/internal/app-passwords/sync') {
		await authStore.syncAppPassword(body);
		return jsonResponse({ ok: true });
	}

	if (url.pathname === '/internal/app-passwords/revoke') {
		await authStore.revokeAppPassword(body);
		return jsonResponse({ ok: true });
	}

	return jsonResponse({ error: 'Not found' }, 404);
}

export function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

import app from '../hono/hono';
import lifecycleService, { isValidLifecycleSecret } from '../service/lifecycle-service';

app.post('/internal/lifecycle/:userId', async (c) => {
	const expected = String(c.env?.lifecycle_service_secret || '').trim();
	if (!expected) return c.json({ error: 'Lifecycle service is not configured.' }, 503);
	const authorization = c.req.header('authorization') || '';
	const actual = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
	if (!(await isValidLifecycleSecret(actual, expected))) {
		return c.json({ error: 'Invalid lifecycle service credential.' }, 401);
	}

	const userId = String(c.req.param('userId') || '').trim();
	const body = await c.req.json().catch(() => null);
	const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
	if (!userId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return c.json({ error: 'User id and valid email are required.' }, 400);
	}
	if (body.action !== 'export' && body.action !== 'delete') {
		return c.json({ error: 'Lifecycle action must be export or delete.' }, 400);
	}

	if (body.action === 'export') {
		const data = await lifecycleService.exportUser(c, email);
		return c.json({ ok: true, service: 'mail', userId, requestId: body.requestId || null, data });
	}
	const deleted = await lifecycleService.deleteUser(c, email);
	return c.json({ ok: true, service: 'mail', userId, requestId: body.requestId || null, deleted });
});

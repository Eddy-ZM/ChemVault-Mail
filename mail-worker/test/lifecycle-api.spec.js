import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/hono/webs';
import lifecycleService from '../src/service/lifecycle-service';

describe('distributed account lifecycle API', () => {
	afterEach(() => vi.restoreAllMocks());

	it('fails closed when the dedicated secret is missing or invalid', async () => {
		const missing = await app.request('/internal/lifecycle/user_1', {
			method: 'POST',
			body: JSON.stringify({ action: 'export', email: 'user@example.com' }),
		});
		expect(missing.status).toBe(503);

		const invalid = await app.request('/internal/lifecycle/user_1', {
			method: 'POST',
			headers: { authorization: 'Bearer wrong', 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'export', email: 'user@example.com' }),
		}, { lifecycle_service_secret: 'lifecycle-secret' });
		expect(invalid.status).toBe(401);
	});

	it('exports through the authenticated internal boundary', async () => {
		vi.spyOn(lifecycleService, 'exportUser').mockResolvedValue({ user: { user_id: 1 }, emails: [] });
		const response = await app.request('/internal/lifecycle/user_1', {
			method: 'POST',
			headers: { authorization: 'Bearer lifecycle-secret', 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'export', email: 'user@example.com', requestId: 'job_1' }),
		}, { lifecycle_service_secret: 'lifecycle-secret' });

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ ok: true, service: 'mail', requestId: 'job_1' });
	});
});

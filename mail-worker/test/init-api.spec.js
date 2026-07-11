import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/hono/webs';
import { dbInit } from '../src/init/init';
import settingService from '../src/service/setting-service';

const jwtSecret = 'safe-init-test-secret';
const initSecret = 'separate-database-init-secret';

function stubMigrations() {
	const spies = [];
	for (const [name, value] of Object.entries(dbInit)) {
		if (name !== 'init' && typeof value === 'function') {
			spies.push(vi.spyOn(dbInit, name).mockResolvedValue(undefined));
		}
	}
	spies.push(vi.spyOn(settingService, 'refresh').mockResolvedValue(undefined));
	return spies;
}

describe('database initialization API', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not expose the legacy GET /init/:secret initializer', async () => {
		const urlSecret = 'do-not-leak-url-secret';
		const response = await app.request(`/init/${encodeURIComponent(urlSecret)}`, { method: 'GET' }, { jwt_secret: jwtSecret, init_secret: initSecret });
		const text = await response.text();

		expect(response.status).toBe(404);
		expect(text).not.toContain(urlSecret);
		expect(text).not.toContain(jwtSecret);
	});

	it('rejects URL query credentials without leaking them', async () => {
		const urlSecret = 'do-not-leak-query-secret';
		const response = await app.request(`/init?secret=${encodeURIComponent(urlSecret)}&token=${encodeURIComponent(urlSecret)}`, { method: 'POST' }, { jwt_secret: jwtSecret, init_secret: initSecret });
		const text = await response.text();

		expect(response.status).toBe(400);
		expect(text).not.toContain(urlSecret);
		expect(text).not.toContain(jwtSecret);
	});

	it('allows POST initialization with a bearer secret from the Authorization header', async () => {
		stubMigrations();

		const response = await app.request('/init', { method: 'POST', headers: { Authorization: `Bearer ${initSecret}` } }, { jwt_secret: jwtSecret, init_secret: initSecret });

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('success');
		expect(dbInit.intDB).toHaveBeenCalled();
	});

	it('uses a generic authorization error for invalid initialization attempts', async () => {
		const suppliedSecret = 'wrong-init-secret-that-must-not-leak';
		const response = await app.request('/init', { method: 'POST', headers: { Authorization: `Bearer ${suppliedSecret}` } }, { jwt_secret: jwtSecret, init_secret: initSecret });
		const text = await response.text();

		expect(response.status).toBe(403);
		expect(text).toBe('Initialization is not authorized.');
		expect(text).not.toContain(suppliedSecret);
		expect(text).not.toContain(jwtSecret);
	});

	it('fails closed when the dedicated initialization secret is not configured', async () => {
		const response = await app.request('/init', { method: 'POST', headers: { Authorization: `Bearer ${initSecret}` } }, { jwt_secret: jwtSecret });

		expect(response.status).toBe(503);
		expect(await response.text()).toBe('Initialization is not configured.');
	});
});

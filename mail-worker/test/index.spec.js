import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

async function expectMailAppShell(response) {
	expect(response.status).toBe(200);
	const html = await response.text();
	expect(html).toContain('ChemVault Mail');
	expect(html).toContain('id="app"');
}

describe('ChemVault Mail worker', () => {
	it('serves the mail app shell (unit style)', async () => {
		const request = new Request('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		await expectMailAppShell(response);
	});

	it('serves the mail app shell (integration style)', async () => {
		const response = await SELF.fetch('http://example.com');
		await expectMailAppShell(response);
	});
});

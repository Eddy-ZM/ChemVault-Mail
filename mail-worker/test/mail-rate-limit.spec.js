import { describe, expect, it } from 'vitest';
import { enforceMailRateLimits } from '../src/service/email-service';

describe('mail send rate-limit availability', () => {
	it('fails closed in production when the KV binding is unavailable', async () => {
		await expect(enforceMailRateLimits({ env: { ENVIRONMENT: 'production' } }, 42)).rejects.toMatchObject({
			code: 503
		});
	});

	it('fails closed when explicitly configured', async () => {
		await expect(enforceMailRateLimits({ env: { MAIL_RATE_LIMIT_FAIL_CLOSED: 'true' } }, 42)).rejects.toMatchObject({
			code: 503
		});
	});

	it('allows local development to run without KV unless fail-closed is enabled', async () => {
		await expect(enforceMailRateLimits({ env: { ENVIRONMENT: 'local' } }, 42)).resolves.toBeUndefined();
	});
});

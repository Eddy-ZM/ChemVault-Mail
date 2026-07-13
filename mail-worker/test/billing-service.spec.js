import { describe, expect, it, vi } from 'vitest';
import {
	billingEnforcementMode,
	enforceMailBillingQuota,
	releaseMailBillingReservation,
	resolveMailBillingEntitlements
} from '../src/service/billing-service';

class BillingDbMock {
	constructor() {
		this.usage = new Map();
	}

	prepare(sql) {
		const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
		let values = [];
		const statement = {
			bind: (...next) => { values = next; return statement; },
			run: async () => {
				if (normalized.startsWith('UPDATE BILLING_MAIL_USAGE')) {
					const [quantity, userId, usageDate] = values;
					const key = `${userId}:${usageDate}`;
					this.usage.set(key, Math.max(0, (this.usage.get(key) || 0) - quantity));
				}
				return { success: true };
			},
			first: async () => {
				const [userId, usageDate, quantity, ceiling] = values;
				const key = `${userId}:${usageDate}`;
				const next = (this.usage.get(key) || 0) + quantity;
				if (next > ceiling) return null;
				this.usage.set(key, next);
				return { recipient_count: next };
			}
		};
		return statement;
	}
}

function env(db, overrides = {}) {
	return {
		db,
		ENVIRONMENT: 'production',
		BILLING_API_ORIGIN: 'https://chemvault.science',
		BILLING_SERVICE_SECRET: 'billing-secret',
		BILLING_ENFORCEMENT_MODE: 'enforce',
		...overrides
	};
}

function entitlementResponse(plan = 'free') {
	return new Response(JSON.stringify({
		ok: true,
		userId: 'usr_123',
		email: 'member@example.com',
		plan
	}), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('mail subscription billing', () => {
	it('defaults production to enforcement and development to shadow', () => {
		expect(billingEnforcementMode({ ENVIRONMENT: 'production' })).toBe('enforce');
		expect(billingEnforcementMode({ ENVIRONMENT: 'development' })).toBe('shadow');
	});

	it('resolves entitlements by verified email with the service secret', async () => {
		const fetchMock = vi.fn(async (url, init) => {
			expect(String(url)).toBe('https://chemvault.science/api/internal/billing/entitlements?email=member%40example.com');
			expect(init.headers.authorization).toBe('Bearer billing-secret');
			return entitlementResponse('pro');
		});
		await expect(resolveMailBillingEntitlements(env(new BillingDbMock()), ' Member@Example.com ', fetchMock))
			.resolves.toEqual({ userId: 'usr_123', email: 'member@example.com', plan: 'pro' });
	});

	it('atomically enforces plan limits and rolls back failed delivery reservations', async () => {
		const db = new BillingDbMock();
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => entitlementResponse('free'));
		try {
			const c = { env: env(db, { MAIL_BILLING_FREE_DAILY_RECIPIENTS: '2' }) };
			const first = await enforceMailBillingQuota(c, {
				email: 'member@example.com',
				recipientCount: 2
			});
			expect(first.used).toBe(2);
			await expect(enforceMailBillingQuota(c, {
				email: 'member@example.com',
				recipientCount: 1
			})).rejects.toMatchObject({ code: 402 });

			await releaseMailBillingReservation(c, first.reservation);
			await expect(enforceMailBillingQuota(c, {
				email: 'member@example.com',
				recipientCount: 1
			})).resolves.toMatchObject({ used: 1, plan: 'free' });
		} finally {
			fetchMock.mockRestore();
		}
	});

	it('fails closed in enforcement mode when billing is unavailable', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
		try {
			await expect(enforceMailBillingQuota({ env: env(new BillingDbMock()) }, {
				email: 'member@example.com',
				recipientCount: 1
			})).rejects.toMatchObject({ code: 503 });
		} finally {
			fetchMock.mockRestore();
		}
	});
});

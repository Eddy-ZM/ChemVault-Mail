import BizError from '../error/biz-error';

const DEFAULT_TIMEOUT_MS = 8000;
const ensuredDatabases = new WeakSet();
const PLAN_DAILY_RECIPIENT_LIMITS = {
	free: 25,
	pro: 250,
	team: 1000,
	enterprise: 5000
};

function clean(value) {
	return String(value ?? '').trim();
}

function normalizeEmail(value) {
	return clean(value).toLowerCase();
}

function normalizePlan(value) {
	const plan = clean(value).toLowerCase();
	return ['free', 'pro', 'team', 'enterprise', 'admin'].includes(plan) ? plan : 'free';
}

function environmentName(env = {}) {
	return clean(env.ENVIRONMENT || env.environment).toLowerCase();
}

export function billingEnforcementMode(env = {}) {
	const explicit = clean(env.BILLING_ENFORCEMENT_MODE || env.billing_enforcement_mode).toLowerCase();
	if (['off', 'shadow', 'enforce'].includes(explicit)) return explicit;
	return environmentName(env) === 'production' ? 'enforce' : 'shadow';
}

function configuredDailyLimit(env, plan) {
	if (plan === 'admin') return Number.MAX_SAFE_INTEGER;
	const key = `MAIL_BILLING_${plan.toUpperCase()}_DAILY_RECIPIENTS`;
	const configured = Number(env?.[key] ?? env?.[key.toLowerCase()]);
	if (Number.isSafeInteger(configured) && configured > 0) return configured;
	return PLAN_DAILY_RECIPIENT_LIMITS[plan] || PLAN_DAILY_RECIPIENT_LIMITS.free;
}

function billingOrigin(env = {}) {
	return clean(env.BILLING_API_ORIGIN || env.billing_api_origin || 'https://chemvault.science').replace(/\/+$/, '');
}

function billingSecret(env = {}) {
	return clean(env.BILLING_SERVICE_SECRET || env.billing_service_secret);
}

export async function resolveMailBillingEntitlements(env, emailAddress, fetchImpl = globalThis.fetch) {
	const email = normalizeEmail(emailAddress);
	const secret = billingSecret(env);
	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new BizError('A verified account email is required for subscription checks.', 503);
	}
	if (!secret) throw new BizError('Subscription enforcement is not configured.', 503);

	const url = new URL(`${billingOrigin(env)}/api/internal/billing/entitlements`);
	url.searchParams.set('email', email);
	let response;
	try {
		response = await fetchImpl(url, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${secret}`,
				'user-agent': 'ChemVault-Mail'
			},
			signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
		});
	} catch {
		throw new BizError('Subscription status is temporarily unavailable.', 503);
	}
	if (!response.ok) throw new BizError('Subscription status is temporarily unavailable.', 503);

	const payload = await response.json().catch(() => null);
	if (!payload?.ok || normalizeEmail(payload.email) !== email || !clean(payload.userId)) {
		throw new BizError('Subscription status could not be verified.', 503);
	}
	return {
		userId: clean(payload.userId),
		email,
		plan: normalizePlan(payload.plan)
	};
}

export async function ensureBillingUsageTable(db) {
	if (!db?.prepare) throw new BizError('Subscription usage storage is unavailable.', 503);
	if (ensuredDatabases.has(db)) return;
	await db.prepare(`
		CREATE TABLE IF NOT EXISTS billing_mail_usage (
			billing_user_id TEXT NOT NULL,
			usage_date TEXT NOT NULL,
			recipient_count INTEGER NOT NULL DEFAULT 0,
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (billing_user_id, usage_date)
		)
	`).run();
	ensuredDatabases.add(db);
}

async function reserveDailyRecipients(db, userId, usageDate, quantity, ceiling) {
	const row = await db.prepare(`
		INSERT INTO billing_mail_usage (billing_user_id, usage_date, recipient_count, updated_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT (billing_user_id, usage_date) DO UPDATE SET
			recipient_count = billing_mail_usage.recipient_count + excluded.recipient_count,
			updated_at = CURRENT_TIMESTAMP
		WHERE billing_mail_usage.recipient_count + excluded.recipient_count <= ?
		RETURNING recipient_count
	`).bind(userId, usageDate, quantity, ceiling).first();
	return Number(row?.recipient_count || 0);
}

export async function enforceMailBillingQuota(c, { email, recipientCount, isAdmin = false } = {}) {
	const quantity = Number(recipientCount);
	if (!Number.isSafeInteger(quantity) || quantity < 1) {
		throw new BizError('At least one valid recipient is required.', 400);
	}

	const mode = billingEnforcementMode(c?.env);
	if (mode === 'off' || isAdmin) {
		return { mode, enforced: false, plan: isAdmin ? 'admin' : 'free', reservation: null };
	}

	let entitlements;
	try {
		entitlements = await resolveMailBillingEntitlements(c.env, email);
	} catch (error) {
		if (mode === 'enforce') throw error;
		console.warn('Mail billing shadow check unavailable.');
		return { mode, enforced: false, plan: 'free', reservation: null };
	}

	const limit = configuredDailyLimit(c.env, entitlements.plan);
	const usageDate = new Date().toISOString().slice(0, 10);
	try {
		await ensureBillingUsageTable(c.env.db);
		const ceiling = mode === 'enforce' ? limit : 2_147_483_647;
		const used = await reserveDailyRecipients(c.env.db, entitlements.userId, usageDate, quantity, ceiling);
		if (!used) {
			throw new BizError(`Daily ${entitlements.plan} email recipient quota reached. Upgrade your plan or try again tomorrow.`, 402);
		}
		if (mode === 'shadow' && used > limit) {
			console.warn(`Mail billing shadow quota exceeded for plan ${entitlements.plan}.`);
		}
		return {
			mode,
			enforced: mode === 'enforce',
			plan: entitlements.plan,
			limit,
			used,
			reservation: { userId: entitlements.userId, usageDate, quantity }
		};
	} catch (error) {
		if (mode === 'enforce' || error?.code === 402) throw error;
		console.warn('Mail billing shadow usage recording unavailable.');
		return { mode, enforced: false, plan: entitlements.plan, limit, reservation: null };
	}
}

export async function releaseMailBillingReservation(c, reservation) {
	if (!reservation || !c?.env?.db?.prepare) return;
	await c.env.db.prepare(`
		UPDATE billing_mail_usage
		SET recipient_count = MAX(0, recipient_count - ?), updated_at = CURRENT_TIMESTAMP
		WHERE billing_user_id = ? AND usage_date = ?
	`).bind(reservation.quantity, reservation.userId, reservation.usageDate).run();
}

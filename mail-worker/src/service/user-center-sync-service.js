import roleService from './role-service';

const DEFAULT_USER_CENTER_SYNC_URL = 'https://user.chemvault.science/api/integrations/mail/users/sync';

const userCenterSyncService = {
	async syncMailUser(c, input) {
		const secret = syncSecret(c);
		const url = syncUrl(c);

		if (!secret || !url) {
			console.warn('ChemVault User Center sync skipped: sync URL or secret is not configured.');
			return { synced: false, skipped: true, reason: 'sync_not_configured' };
		}

		const payload = await buildPayload(c, input);
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-chemvault-sync-secret': secret
			},
			body: JSON.stringify(payload)
		});
		let body = null;
		try {
			body = await response.json();
		} catch {
			body = null;
		}

		if (!response.ok) {
			console.error('ChemVault User Center sync failed', response.status, body);
			return {
				synced: false,
				skipped: false,
				reason: 'user_center_sync_failed',
				status: response.status,
				body
			};
		}

		return { synced: true, skipped: false, body };
	}
};

async function buildPayload(c, input) {
	const primaryEmail = normalizeEmail(input.primaryEmail || input.email);
	const mailAddress = normalizeEmail(input.mailAddress || primaryEmail);
	const displayName = input.displayName || input.name || localPart(mailAddress);
	const roleRow = input.type ? await roleService.selectById(c, input.type) : null;
	const mailRole = resolveMailRole(c, primaryEmail, roleRow);
	const canSend = await resolveCanSend(c, primaryEmail, input.type);

	return {
		primaryEmail,
		email: primaryEmail,
		name: input.name || localPart(primaryEmail),
		mailAddress,
		displayName,
		mailRole,
		mailStatus: input.mailStatus || 'active',
		canSend,
		canReceive: input.canReceive !== false,
		canLoginMail: input.canLoginMail !== false,
		mailboxQuotaMb: Number(input.mailboxQuotaMb || 1024),
		aliases: Array.isArray(input.aliases) ? input.aliases : [],
		sourceUserId: input.userId ? String(input.userId) : null
	};
}

function syncUrl(c) {
	return String(
		c.env.chemvault_user_sync_url ||
		c.env.CHEMVAULT_USER_SYNC_URL ||
		DEFAULT_USER_CENTER_SYNC_URL
	).trim();
}

function syncSecret(c) {
	return String(
		c.env.user_system_sync_secret ||
		c.env.USER_SYSTEM_SYNC_SECRET ||
		c.env.MAIL_SYSTEM_SYNC_SECRET ||
		c.env.mail_sso_secret ||
		c.env.MAIL_SYSTEM_SSO_SECRET ||
		''
	).trim();
}

function resolveMailRole(c, email, roleRow) {
	if (normalizeEmail(c.env.admin || '') === email) return 'mailbox_super';

	const marker = `${roleRow?.key || ''} ${roleRow?.name || ''}`.toLowerCase();
	if (marker.includes('super')) return 'mailbox_super';
	if (marker.includes('admin')) return 'mailbox_admin';
	return 'mailbox_user';
}

async function resolveCanSend(c, email, type) {
	if (normalizeEmail(c.env.admin || '') === normalizeEmail(email)) return true;
	if (!type) return true;
	const rows = await roleService.selectByIdsHasPermKey(c, [type], 'email:send');
	return rows.length > 0;
}

function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase();
}

function localPart(value) {
	return normalizeEmail(value).split('@')[0] || normalizeEmail(value);
}

export default userCenterSyncService;

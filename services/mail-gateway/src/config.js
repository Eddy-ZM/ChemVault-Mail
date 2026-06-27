import path from 'node:path';

export function loadConfig(env = process.env) {
	const mailDomain = env.MAIL_DOMAIN || 'chemvault.science';
	return {
		mailDomain,
		maildirRoot: env.MAILDIR_ROOT || '/var/vmail',
		httpHost: env.MAIL_GATEWAY_HTTP_HOST || '0.0.0.0',
		httpPort: Number(env.MAIL_GATEWAY_HTTP_PORT || 8789),
		smtpHost: env.SMTP_LISTEN_HOST || '0.0.0.0',
		smtpPort: Number(env.SMTP_DEV_PORT || env.SMTP_PORT || 2525),
		resendApiKey: env.RESEND_API_KEY || '',
		resendWebhookSecret: env.RESEND_WEBHOOK_SECRET || '',
		internalToken: env.INTERNAL_MAIL_GATEWAY_TOKEN || '',
		mainAppInternalUrl: env.MAIN_APP_INTERNAL_URL || '',
		authStorePath: env.MAIL_GATEWAY_AUTH_STORE || path.join(process.cwd(), 'data', 'auth-store.json'),
		auditLogPath: env.MAIL_GATEWAY_AUDIT_LOG || path.join(process.cwd(), 'data', 'audit.log'),
		metadataStorePath: env.MAIL_GATEWAY_METADATA_STORE || path.join(process.cwd(), 'data', 'mail-metadata.jsonl'),
		dovecotUsersFile: env.DOVECOT_USERS_FILE || path.join(process.cwd(), 'data', 'dovecot-users'),
		dailySmtpLimit: Number(env.DAILY_SMTP_LIMIT || 100),
		tlsKeyPath: env.SMTP_TLS_KEY_PATH || '',
		tlsCertPath: env.SMTP_TLS_CERT_PATH || ''
	};
}

export function localpartFromEmail(email, domain) {
	const normalized = String(email || '').trim().toLowerCase();
	const suffix = `@${domain}`;
	if (!normalized.endsWith(suffix)) {
		throw new Error(`Email must belong to ${domain}`);
	}
	const localpart = normalized.slice(0, -suffix.length);
	if (!/^[a-z0-9._%+-]+$/.test(localpart)) {
		throw new Error('Unsafe mailbox localpart');
	}
	return localpart;
}

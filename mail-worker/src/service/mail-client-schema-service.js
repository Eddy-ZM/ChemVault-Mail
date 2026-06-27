const mailClientSchemaService = {
	async ensure(c) {
		await ensureMailClientTables(c);
		await ensureMailClientEmailColumns(c);
	}
};

export async function ensureMailClientTables(c) {
	await c.env.db.batch([
		c.env.db.prepare(`
			CREATE TABLE IF NOT EXISTS mail_app_passwords (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id INTEGER NOT NULL,
				email_address TEXT NOT NULL,
				name TEXT NOT NULL,
				password_hash TEXT NOT NULL,
				scopes TEXT NOT NULL DEFAULT '["imap","smtp"]',
				created_at TEXT NOT NULL DEFAULT '',
				last_used_at TEXT NOT NULL DEFAULT '',
				revoked_at TEXT NOT NULL DEFAULT '',
				last_failed_at TEXT NOT NULL DEFAULT '',
				failed_count INTEGER NOT NULL DEFAULT 0
			)
		`),
		c.env.db.prepare(`
			CREATE INDEX IF NOT EXISTS idx_mail_app_passwords_user
			ON mail_app_passwords(user_id, email_address)
		`),
		c.env.db.prepare(`
			CREATE TABLE IF NOT EXISTS mail_client_audit_logs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id INTEGER,
				email_address TEXT NOT NULL DEFAULT '',
				event_type TEXT NOT NULL,
				protocol TEXT NOT NULL DEFAULT '',
				ip_address TEXT NOT NULL DEFAULT '',
				user_agent TEXT NOT NULL DEFAULT '',
				success INTEGER NOT NULL DEFAULT 0,
				reason TEXT NOT NULL DEFAULT '',
				created_at TEXT NOT NULL DEFAULT ''
			)
		`),
		c.env.db.prepare(`
			CREATE INDEX IF NOT EXISTS idx_mail_client_audit_logs_user
			ON mail_client_audit_logs(user_id, email_address, created_at)
		`)
	]);
}

export async function ensureMailClientEmailColumns(c) {
	const emailColumns = [
		`ALTER TABLE email ADD COLUMN headers TEXT NOT NULL DEFAULT '{}';`,
		`ALTER TABLE email ADD COLUMN attachments_metadata TEXT NOT NULL DEFAULT '[]';`,
		`ALTER TABLE email ADD COLUMN mailbox_path TEXT NOT NULL DEFAULT '';`,
		`ALTER TABLE email ADD COLUMN raw_eml_path TEXT NOT NULL DEFAULT '';`,
		`ALTER TABLE email ADD COLUMN received_at TEXT NOT NULL DEFAULT '';`
	];

	for (const sql of emailColumns) {
		try {
			await c.env.db.prepare(sql).run();
		} catch (e) {
			if (!String(e.message || '').includes('duplicate column name')) {
				console.warn(`Skipping Mail Client schema column: ${e.message}`);
			}
		}
	}
}

export default mailClientSchemaService;

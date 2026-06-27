import app from '../hono/hono';
import result from '../model/result';
import userContext from '../security/user-context';
import appPasswordService from '../service/app-password-service';
import { emailConst } from '../const/entity-const';

app.get('/my/mail-client/config', async (c) => {
	const user = userContext.getUser(c);
	const data = await appPasswordService.config(c, user);
	return c.json(result.ok(data));
});

app.post('/my/mail-client/app-passwords', async (c) => {
	const user = userContext.getUser(c);
	const data = await appPasswordService.create(c, await c.req.json(), user);
	return c.json(result.ok(data));
});

app.put('/my/mail-client/app-passwords/:id/revoke', async (c) => {
	const user = userContext.getUser(c);
	const data = await appPasswordService.revoke(c, c.req.param('id'), user);
	return c.json(result.ok(data));
});

app.post('/internal/mail-client/inbound', async (c) => {
	if (!isInternalGatewayRequest(c)) {
		return c.json(result.fail('Unauthorized', 401), 401);
	}

	const body = await c.req.json();
	const recipient = String(body.recipient || '').trim().toLowerCase();
	const messageId = String(body.messageId || '').trim();

	if (!recipient) {
		return c.json(result.fail('recipient is required', 400), 400);
	}

	const account = await c.env.db.prepare(`
		SELECT account_id, user_id, email, name
		FROM account
		WHERE lower(email) = lower(?) AND is_del = 0
		LIMIT 1
	`).bind(recipient).first();

	if (!account) {
		return c.json(result.fail('mailbox not found', 404), 404);
	}

	if (messageId) {
		const existing = await c.env.db.prepare(`
			SELECT email_id FROM email
			WHERE message_id = ? AND to_email = ? AND type = ?
			LIMIT 1
		`).bind(messageId, recipient, emailConst.type.RECEIVE).first();
		if (existing) {
			return c.json(result.ok({ duplicate: true, emailId: existing.email_id }));
		}
	}

	const now = body.receivedAt || new Date().toISOString();
	const row = await c.env.db.prepare(`
		INSERT INTO email (
			send_email, name, account_id, user_id, subject, text, content,
			cc, bcc, recipient, to_email, to_name, message_id, type, status,
			headers, attachments_metadata, mailbox_path, raw_eml_path, received_at,
			unread, create_time
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING email_id
	`).bind(
		body.from || '',
		body.fromName || '',
		account.account_id,
		account.user_id,
		body.subject || '',
		body.text || '',
		body.html || '',
		JSON.stringify(body.cc || []),
		JSON.stringify(body.bcc || []),
		JSON.stringify(body.to || [recipient]),
		recipient,
		account.name || '',
		messageId,
		emailConst.type.RECEIVE,
		emailConst.status.RECEIVE,
		JSON.stringify(body.headers || {}),
		JSON.stringify(body.attachments || []),
		body.mailboxPath || '',
		body.rawEmlPath || '',
		now,
		emailConst.unread.UNREAD,
		now
	).first();

	return c.json(result.ok({ duplicate: false, emailId: row.email_id }));
});

app.post('/internal/mail-client/audit', async (c) => {
	if (!isInternalGatewayRequest(c)) {
		return c.json(result.fail('Unauthorized', 401), 401);
	}

	const body = await c.req.json();
	const emailAddress = String(body.email || '').trim().toLowerCase();
	const now = new Date().toISOString();
	const user = emailAddress
		? await c.env.db.prepare(`
			SELECT user_id FROM user WHERE lower(email) = lower(?) AND is_del = 0 LIMIT 1
		`).bind(emailAddress).first()
		: null;

	await c.env.db.prepare(`
		INSERT INTO mail_client_audit_logs (
			user_id, email_address, event_type, protocol, ip_address, user_agent,
			success, reason, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		user?.user_id || null,
		emailAddress,
		body.eventType || 'auth',
		body.protocol || '',
		body.ipAddress || '',
		body.userAgent || '',
		body.success ? 1 : 0,
		body.reason || '',
		body.createdAt || now
	).run();

	if (emailAddress && body.eventType === 'auth') {
		if (body.success) {
			await c.env.db.prepare(`
				UPDATE mail_app_passwords
				SET last_used_at = ?
				WHERE email_address = ?
					AND revoked_at = ''
					AND (? IS NULL OR id = ?)
			`).bind(now, emailAddress, body.appPasswordId || null, body.appPasswordId || null).run();
		} else {
			await c.env.db.prepare(`
				UPDATE mail_app_passwords
				SET last_failed_at = ?, failed_count = failed_count + 1
				WHERE email_address = ?
					AND revoked_at = ''
			`).bind(now, emailAddress).run();
		}
	}

	return c.json(result.ok());
});

function isInternalGatewayRequest(c) {
	const authorization = c.req.header('Authorization') || '';
	return Boolean(c.env.INTERNAL_MAIL_GATEWAY_TOKEN && authorization === `Bearer ${c.env.INTERNAL_MAIL_GATEWAY_TOKEN}`);
}

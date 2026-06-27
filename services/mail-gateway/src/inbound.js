import { createHmac, timingSafeEqual } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { writeMaildirMessage } from './maildir.js';

export function createMemoryInboundDeduper() {
	const keys = new Set();
	return {
		async has(key) {
			return keys.has(key);
		},
		async add(key) {
			keys.add(key);
		}
	};
}

export async function processInboundEmail({ payload, config, deduper = createMemoryInboundDeduper(), metadataStore }) {
	const recipient = normalizeRecipient(payload.recipient || payload.to?.[0]?.email || payload.to?.[0]);
	const rawMessage = payload.raw || payload.rawEmail || rebuildRawMessage(payload);
	const messageId = payload.messageId || headerValue(rawMessage, 'message-id') || '';
	const dedupeKey = payload.eventId || `${messageId}:${recipient}`;

	if (await deduper.has(dedupeKey)) {
		return { duplicate: true, dedupeKey };
	}

	const written = await writeMaildirMessage({
		maildirRoot: config.maildirRoot,
		domain: config.mailDomain,
		email: recipient,
		rawMessage
	});

	await deduper.add(dedupeKey);
	const metadata = {
		eventId: payload.eventId || '',
		messageId,
		recipient,
		from: payload.from || '',
		to: payload.to || [recipient],
		cc: payload.cc || [],
		bcc: payload.bcc || [],
		subject: payload.subject || headerValue(rawMessage, 'subject') || '',
		text: payload.text || '',
		html: payload.html || '',
		headers: payload.headers || {},
		receivedAt: payload.receivedAt || new Date().toISOString(),
		attachments: payload.attachments || [],
		mailboxPath: path.dirname(written.finalPath),
		rawEmlPath: written.finalPath
	};

	if (metadataStore?.save) {
		await metadataStore.save(metadata);
	} else if (config.metadataStorePath) {
		await mkdir(path.dirname(config.metadataStorePath), { recursive: true });
		await appendFile(config.metadataStorePath, `${JSON.stringify(metadata)}\n`, { mode: 0o600 });
	}

	return { duplicate: false, dedupeKey, metadata, finalPath: written.finalPath };
}

export function verifyWebhookSignature({ rawBody, secret, headers }) {
	if (!secret) {
		return false;
	}

	const directSecret = headers['x-webhook-secret'] || headers['x-resend-webhook-secret'];
	if (directSecret && timingSafeStringEqual(directSecret, secret)) {
		return true;
	}

	const signature = headers['x-resend-signature'] || headers['x-signature'];
	if (!signature) {
		return false;
	}
	const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
	return timingSafeStringEqual(signature.replace(/^sha256=/, ''), digest);
}

function rebuildRawMessage(payload) {
	const headers = [
		`From: ${payload.from || ''}`,
		`To: ${Array.isArray(payload.to) ? payload.to.join(', ') : payload.to || ''}`,
		`Subject: ${payload.subject || ''}`,
		`Message-ID: ${payload.messageId || `<${Date.now()}@chemvault.local>`}`,
		'MIME-Version: 1.0',
		payload.html ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8'
	];
	return `${headers.join('\r\n')}\r\n\r\n${payload.html || payload.text || ''}`;
}

function headerValue(rawMessage, name) {
	const raw = Buffer.isBuffer(rawMessage) ? rawMessage.toString('utf8') : String(rawMessage || '');
	const match = raw.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
	return match?.[1]?.trim() || '';
}

function normalizeRecipient(value) {
	const recipient = String(value || '').trim().toLowerCase();
	if (!recipient.includes('@')) {
		throw new Error('Inbound recipient is required');
	}
	return recipient;
}

function timingSafeStringEqual(a, b) {
	const left = Buffer.from(String(a));
	const right = Buffer.from(String(b));
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}

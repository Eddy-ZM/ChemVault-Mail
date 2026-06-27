import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { createMemoryInboundDeduper, processInboundEmail, verifyWebhookSignature } from '../src/inbound.js';

test('writes inbound email once for a duplicate event id', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'chemvault-inbound-'));
	const deduper = createMemoryInboundDeduper();
	const payload = {
		eventId: 'evt_1',
		recipient: 'edward@chemvault.science',
		raw: 'Message-ID: <m1@example.com>\r\nSubject: Hello\r\n\r\nBody'
	};

	const first = await processInboundEmail({
		payload,
		config: { maildirRoot: root, mailDomain: 'chemvault.science' },
		deduper
	});
	const second = await processInboundEmail({
		payload,
		config: { maildirRoot: root, mailDomain: 'chemvault.science' },
		deduper
	});

	const inboxFiles = await readdir(path.join(root, 'chemvault.science', 'edward', 'Maildir', 'new'));
	assert.equal(first.duplicate, false);
	assert.equal(second.duplicate, true);
	assert.equal(inboxFiles.length, 1);
});

test('verifies webhook signatures without accepting mismatches', () => {
	const rawBody = JSON.stringify({ id: 'evt_1' });
	const secret = 'local-webhook-secret';
	const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

	assert.equal(verifyWebhookSignature({
		rawBody,
		secret,
		headers: { 'x-resend-signature': `sha256=${signature}` }
	}), true);
	assert.equal(verifyWebhookSignature({
		rawBody,
		secret,
		headers: { 'x-resend-signature': 'sha256=bad' }
	}), false);
});

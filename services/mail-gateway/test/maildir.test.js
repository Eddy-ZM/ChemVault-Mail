import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ensureMailboxMaildir, writeMaildirMessage } from '../src/maildir.js';

test('creates standard Maildir folders for a mailbox', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'chemvault-maildir-'));

	const mailbox = await ensureMailboxMaildir({
		maildirRoot: root,
		domain: 'chemvault.science',
		email: 'edward@chemvault.science'
	});

	assert.equal(mailbox.localpart, 'edward');
	assert.deepEqual(await readdir(path.join(mailbox.maildirPath, 'new')), []);
	assert.deepEqual(await readdir(path.join(mailbox.maildirPath, '.Sent', 'new')), []);
	assert.deepEqual(await readdir(path.join(mailbox.maildirPath, '.Trash', 'cur')), []);
});

test('writes inbound and sent messages with tmp-to-new rename semantics', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'chemvault-maildir-'));
	const raw = Buffer.from('Subject: Test\r\n\r\nHello');

	const inbox = await writeMaildirMessage({
		maildirRoot: root,
		domain: 'chemvault.science',
		email: 'edward@chemvault.science',
		rawMessage: raw
	});
	const sent = await writeMaildirMessage({
		maildirRoot: root,
		domain: 'chemvault.science',
		email: 'edward@chemvault.science',
		rawMessage: raw,
		folder: 'Sent'
	});

	assert.equal(path.basename(path.dirname(inbox.finalPath)), 'new');
	assert.equal(path.basename(path.dirname(sent.finalPath)), 'new');
	assert.equal(path.basename(path.dirname(path.dirname(sent.finalPath))), '.Sent');
	assert.equal((await readdir(path.join(root, 'chemvault.science', 'edward', 'Maildir', 'tmp'))).length, 0);
});

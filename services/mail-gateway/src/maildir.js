import { constants } from 'node:fs';
import { mkdir, open, rename } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { localpartFromEmail } from './config.js';

const folders = ['', '.Sent', '.Trash', '.Archive', '.Drafts'];
const subdirs = ['tmp', 'new', 'cur'];

export async function ensureMailboxMaildir({ maildirRoot, domain, email }) {
	const localpart = localpartFromEmail(email, domain);
	const homePath = path.join(maildirRoot, domain, localpart);
	const maildirPath = path.join(homePath, 'Maildir');

	for (const folder of folders) {
		const base = folder ? path.join(maildirPath, folder) : maildirPath;
		for (const subdir of subdirs) {
			await mkdir(path.join(base, subdir), { recursive: true });
		}
	}

	return { localpart, homePath, maildirPath };
}

export async function writeMaildirMessage({ maildirRoot, domain, email, rawMessage, folder = '' }) {
	const mailbox = await ensureMailboxMaildir({ maildirRoot, domain, email });
	const folderName = normalizeFolder(folder);
	const folderPath = folderName ? path.join(mailbox.maildirPath, `.${folderName}`) : mailbox.maildirPath;
	const filename = maildirFilename();
	const tmpPath = path.join(folderPath, 'tmp', filename);
	const finalPath = path.join(folderPath, 'new', filename);
	const file = await open(tmpPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);

	try {
		await file.writeFile(Buffer.isBuffer(rawMessage) ? rawMessage : Buffer.from(String(rawMessage)));
		await file.sync();
	} finally {
		await file.close();
	}

	await rename(tmpPath, finalPath);
	return { ...mailbox, finalPath, folder: folderName || 'INBOX' };
}

function normalizeFolder(folder) {
	if (!folder || folder === 'INBOX') {
		return '';
	}
	const clean = String(folder).replace(/^\./, '');
	if (!['Sent', 'Trash', 'Archive', 'Drafts'].includes(clean)) {
		throw new Error('Unsupported Maildir folder');
	}
	return clean;
}

function maildirFilename() {
	const timestamp = Math.floor(Date.now() / 1000);
	const pid = process.pid;
	const random = randomBytes(8).toString('hex');
	const hostname = os.hostname().replace(/[^A-Za-z0-9.-]/g, '_');
	return `${timestamp}.M${Date.now()}P${pid}Q${random}.${hostname}`;
}

import bcrypt from 'bcryptjs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureMailboxMaildir } from './maildir.js';
import { localpartFromEmail } from './config.js';

const bcryptRounds = 12;

export function createMemoryAuthStore() {
	const entries = [];
	return createAuthStoreFromAdapter({
		async load() {
			return entries;
		},
		async save(nextEntries) {
			entries.splice(0, entries.length, ...nextEntries);
		},
		async renderDovecotUsers() {}
	});
}

export function createFileAuthStore(config) {
	return createAuthStoreFromAdapter({
		async load() {
			try {
				return JSON.parse(await readFile(config.authStorePath, 'utf8'));
			} catch (error) {
				if (error.code === 'ENOENT') return [];
				throw error;
			}
		},
		async save(entries) {
			await mkdir(path.dirname(config.authStorePath), { recursive: true });
			await atomicWriteJSON(config.authStorePath, entries);
			await renderDovecotUsersFile(config, entries);
		},
		async renderDovecotUsers(entries) {
			await renderDovecotUsersFile(config, entries);
		}
	});
}

function createAuthStoreFromAdapter(adapter) {
	return {
		async listEntries() {
			return cloneEntries(await adapter.load());
		},

		async syncAppPassword({ id, email, plainAppPassword, scopes = ['imap', 'smtp'], revoked = false }) {
			if (!email || !plainAppPassword) {
				throw new Error('email and plainAppPassword are required');
			}

			const entries = await adapter.load();
			const normalizedEmail = email.trim().toLowerCase();
			const passwordHash = await bcrypt.hash(plainAppPassword, bcryptRounds);
			const key = credentialKey(id, normalizedEmail);
			const next = entries.filter(entry => credentialKey(entry.id, entry.email) !== key);
			next.push({
				id,
				email: normalizedEmail,
				passwordHash,
				scopes: normalizeScopes(scopes),
				revoked: Boolean(revoked),
				updatedAt: new Date().toISOString()
			});
			await adapter.save(next);
		},

		async revokeAppPassword({ id, email }) {
			const entries = await adapter.load();
			const normalizedEmail = email?.trim().toLowerCase();
			const next = entries.map(entry => {
				const matchesId = id !== undefined && id !== null && String(entry.id) === String(id);
				const matchesEmail = normalizedEmail && entry.email === normalizedEmail;
				if (matchesId || (!id && matchesEmail)) {
					return { ...entry, revoked: true, revokedAt: new Date().toISOString() };
				}
				return entry;
			});
			await adapter.save(next);
		},

		async verifyAppPassword(email, plainAppPassword, scope) {
			return Boolean(await this.authenticateAppPassword(email, plainAppPassword, scope));
		},

		async authenticateAppPassword(email, plainAppPassword, scope) {
			const normalizedEmail = String(email || '').trim().toLowerCase();
			const entries = await adapter.load();
			for (const entry of entries) {
				if (entry.email !== normalizedEmail || entry.revoked || !entry.scopes?.includes(scope)) {
					continue;
				}
				if (await bcrypt.compare(plainAppPassword, entry.passwordHash)) {
					return {
						id: entry.id,
						email: entry.email,
						scopes: [...(entry.scopes || [])]
					};
				}
			}
			return null;
		}
	};
}

async function renderDovecotUsersFile(config, entries) {
	if (!config.dovecotUsersFile) return;
	await mkdir(path.dirname(config.dovecotUsersFile), { recursive: true });
	const latestByEmail = new Map();
	for (const entry of entries) {
		if (entry.revoked || !entry.scopes?.includes('imap')) continue;
		latestByEmail.set(entry.email, entry);
	}

	const lines = [];
	for (const entry of latestByEmail.values()) {
		const localpart = localpartFromEmail(entry.email, config.mailDomain);
		const homePath = path.join(config.maildirRoot, config.mailDomain, localpart);
		await ensureMailboxMaildir({ maildirRoot: config.maildirRoot, domain: config.mailDomain, email: entry.email });
		lines.push(`${entry.email}:{BLF-CRYPT}${entry.passwordHash}:5000:5000::${homePath}::userdb_mail=maildir:${homePath}/Maildir`);
	}
	await writeFile(config.dovecotUsersFile, `${lines.join('\n')}${lines.length ? '\n' : ''}`, { mode: 0o600 });
}

async function atomicWriteJSON(filePath, value) {
	const tmpPath = `${filePath}.${process.pid}.tmp`;
	await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
	await rename(tmpPath, filePath);
}

function normalizeScopes(scopes) {
	const values = Array.isArray(scopes) ? scopes : [];
	return ['imap', 'smtp'].filter(scope => values.includes(scope));
}

function credentialKey(id, email) {
	return id === undefined || id === null ? `email:${email}` : `id:${id}`;
}

function cloneEntries(entries) {
	return entries.map(entry => ({ ...entry, scopes: [...(entry.scopes || [])] }));
}

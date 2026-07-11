import userService from './user-service';

function publicUser(row) {
	if (!row) return null;
	const { password: _password, salt: _salt, ...profile } = row;
	return profile;
}

export async function isValidLifecycleSecret(actual, expected) {
	if (!actual || !expected) return false;
	const encoder = new TextEncoder();
	const [left, right] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(actual)),
		crypto.subtle.digest('SHA-256', encoder.encode(expected)),
	]);
	const leftBytes = new Uint8Array(left);
	const rightBytes = new Uint8Array(right);
	let mismatch = leftBytes.length ^ rightBytes.length;
	for (let index = 0; index < Math.max(leftBytes.length, rightBytes.length); index += 1) {
		mismatch |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
	}
	return mismatch === 0;
}

async function rows(c, query, ...params) {
	const result = await c.env.db.prepare(query).bind(...params).all();
	return result.results || [];
}

const lifecycleService = {
	async findUser(c, email) {
		const result = await rows(c, 'SELECT * FROM user WHERE lower(email) = lower(?) LIMIT 1', email);
		return result[0] || null;
	},

	async exportUser(c, email) {
		const user = await this.findUser(c, email);
		if (!user) {
			return { user: null, accounts: [], emails: [], attachments: [], oauth: [], contentIncluded: false };
		}
		const userId = Number(user.user_id);
		const [accounts, emails, attachments, oauth] = await Promise.all([
			rows(c, 'SELECT * FROM account WHERE user_id = ? ORDER BY create_time DESC', userId),
			rows(c, 'SELECT * FROM email WHERE user_id = ? ORDER BY create_time DESC', userId),
			rows(c, 'SELECT att_id, user_id, email_id, account_id, filename, mime_type, size, status, type, disposition, related, content_id, encoding, create_time FROM attachments WHERE user_id = ? ORDER BY create_time DESC', userId),
			rows(c, 'SELECT oauth_id, oauth_user_id, username, name, avatar, active, trust_level, silenced, create_time FROM oauth WHERE user_id = ? ORDER BY create_time DESC', userId),
		]);
		return {
			user: publicUser(user),
			accounts,
			emails,
			attachments,
			oauth,
			contentIncluded: false,
		};
	},

	async deleteUser(c, email) {
		const user = await this.findUser(c, email);
		if (!user) return { userDeleted: false, recordsAlreadyAbsent: true };
		const userId = Number(user.user_id);
		const counts = await Promise.all([
			rows(c, 'SELECT count(*) AS count FROM account WHERE user_id = ?', userId),
			rows(c, 'SELECT count(*) AS count FROM email WHERE user_id = ?', userId),
			rows(c, 'SELECT count(*) AS count FROM attachments WHERE user_id = ?', userId),
		]);
		await userService.physicsDelete(c, { userIds: String(userId) });
		return {
			userDeleted: true,
			accountsDeleted: Number(counts[0][0]?.count || 0),
			emailsDeleted: Number(counts[1][0]?.count || 0),
			attachmentsDeleted: Number(counts[2][0]?.count || 0),
		};
	},
};

export default lifecycleService;

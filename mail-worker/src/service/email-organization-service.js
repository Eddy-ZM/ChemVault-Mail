export const defaultEmailCategories = [
	'Work',
	'Personal',
	'Finance',
	'Follow-up'
];

export const emailOrganizationColumns = [
	{
		name: 'flagged',
		sql: `ALTER TABLE email ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;`
	},
	{
		name: 'category',
		sql: `ALTER TABLE email ADD COLUMN category TEXT NOT NULL DEFAULT '';`
	},
	{
		name: 'archived',
		sql: `ALTER TABLE email ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;`
	}
];

export async function ensureEmailOrganizationColumns(c) {
	if (!c?.env?.db) {
		return;
	}

	const { results = [] } = await c.env.db.prepare(`PRAGMA table_info(email)`).all();
	const existingColumns = new Set(results.map(row => row.name));
	const missingColumns = emailOrganizationColumns.filter(column => !existingColumns.has(column.name));

	for (const column of missingColumns) {
		try {
			await c.env.db.prepare(column.sql).run();
		} catch (e) {
			console.warn(`Skip email organization column ${column.name}: ${e.message}`);
		}
	}
}

export function normalizeEmailIds(emailIds) {
	if (Array.isArray(emailIds)) {
		return uniquePositiveInts(emailIds);
	}

	if (typeof emailIds === 'number') {
		return uniquePositiveInts([emailIds]);
	}

	if (typeof emailIds === 'string') {
		return uniquePositiveInts(emailIds.split(','));
	}

	return [];
}

export function normalizeCategory(category) {
	if (category == null) {
		return '';
	}

	return String(category)
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 32);
}

export function normalizeBinaryState(value, fallback = 1) {
	if (value === undefined || value === null || value === '') {
		return fallback ? 1 : 0;
	}

	if (value === true || value === 'true') {
		return 1;
	}

	if (value === false || value === 'false') {
		return 0;
	}

	return Number(value) ? 1 : 0;
}

function uniquePositiveInts(values) {
	return [...new Set(values.map(value => Number(value)).filter(value => Number.isInteger(value) && value > 0))];
}

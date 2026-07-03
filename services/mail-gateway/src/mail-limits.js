export const defaultMailLimits = {
	maxRecipientsPerEmail: 20,
	maxEmailsPerMinutePerUser: 5,
	maxEmailsPerDayPerUser: 100,
	maxAttachmentSizeBytes: 10 * 1024 * 1024,
	maxAttachmentsPerEmail: 10,
	blockedExtensions: new Set(['.app', '.bat', '.cmd', '.cjs', '.dmg', '.exe', '.html', '.jar', '.js', '.mjs', '.php', '.py', '.sh'])
};

export function normalizeMailLimits(config = {}) {
	return {
		maxRecipientsPerEmail: positiveNumber(config.maxRecipientsPerEmail, defaultMailLimits.maxRecipientsPerEmail),
		maxEmailsPerMinutePerUser: positiveNumber(config.maxEmailsPerMinutePerUser, defaultMailLimits.maxEmailsPerMinutePerUser),
		maxEmailsPerDayPerUser: positiveNumber(config.maxEmailsPerDayPerUser, defaultMailLimits.maxEmailsPerDayPerUser),
		maxAttachmentSizeBytes: positiveNumber(config.maxAttachmentSizeBytes, defaultMailLimits.maxAttachmentSizeBytes),
		maxAttachmentsPerEmail: positiveNumber(config.maxAttachmentsPerEmail, defaultMailLimits.maxAttachmentsPerEmail),
		blockedExtensions: defaultMailLimits.blockedExtensions
	};
}

export function assertMessageWithinLimits({ to = [], attachments = [], limits = defaultMailLimits }) {
	if (!Array.isArray(to) || to.length === 0) {
		throw Object.assign(new Error('At least one recipient is required'), { responseCode: 554 });
	}
	if (to.length > limits.maxRecipientsPerEmail) {
		throw Object.assign(new Error(`Too many recipients. Maximum is ${limits.maxRecipientsPerEmail}.`), { responseCode: 452 });
	}
	if (attachments.length > limits.maxAttachmentsPerEmail) {
		throw Object.assign(new Error(`Too many attachments. Maximum is ${limits.maxAttachmentsPerEmail}.`), { responseCode: 552 });
	}
	for (const attachment of attachments) {
		const filename = String(attachment.filename || attachment.name || '').toLowerCase();
		const size = Number(attachment.size || attachment.length || attachment.content?.length || 0);
		if (size > limits.maxAttachmentSizeBytes) {
			throw Object.assign(new Error(`Attachment is too large. Maximum is ${limits.maxAttachmentSizeBytes} bytes.`), { responseCode: 552 });
		}
		if ([...limits.blockedExtensions].some((extension) => filename.endsWith(extension))) {
			throw Object.assign(new Error('Attachment file type is not allowed.'), { responseCode: 552 });
		}
	}
	return true;
}

function positiveNumber(value, fallback) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : fallback;
}

import { assertMessageWithinLimits } from './mail-limits.js';

export function assertEnvelopeAllowed({ authenticatedEmail, from, to, attachments = [], limits }) {
	const normalizedUser = normalizeEmail(authenticatedEmail);
	const normalizedFrom = normalizeEmail(from);
	if (!normalizedUser || normalizedFrom !== normalizedUser) {
		throw Object.assign(new Error('From address must belong to authenticated user'), { responseCode: 553 });
	}
	assertMessageWithinLimits({ to, attachments, limits });
	return true;
}

export async function sendWithResend({ apiKey, message, fetchImpl = fetch }) {
	if (!apiKey) {
		throw Object.assign(new Error('RESEND_API_KEY is not configured'), { responseCode: 451 });
	}

	const response = await fetchImpl('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: message.from,
			to: message.to,
			subject: message.subject || '(no subject)',
			text: message.text || undefined,
			html: message.html || undefined,
			headers: message.headers || undefined
		})
	});

	if (!response.ok) {
		await response.text().catch(() => '');
		throw Object.assign(new Error(`Resend send failed with ${response.status}. Provider details suppressed.`), { responseCode: 451 });
	}

	return response.json().catch(() => ({}));
}

function normalizeEmail(value) {
	const match = String(value || '').match(/<([^>]+)>/);
	return (match ? match[1] : value).trim().toLowerCase();
}

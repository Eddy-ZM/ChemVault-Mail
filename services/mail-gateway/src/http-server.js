import http from 'node:http';
import { handleInternalRequest, jsonResponse } from './internal-api.js';
import { processInboundEmail, verifyWebhookSignature } from './inbound.js';

export function createHttpServer({ config, authStore, inboundDeduper, metadataStore }) {
	return http.createServer(async (nodeReq, nodeRes) => {
		try {
			const request = await toWebRequest(nodeReq, config);
			const url = new URL(request.url);
			let response;

			if (url.pathname === '/health' && request.method === 'GET') {
				response = jsonResponse({ ok: true, service: 'chemvault-mail-gateway' });
			} else if (url.pathname.startsWith('/internal/')) {
				response = await handleInternalRequest({ request, config, authStore });
			} else if (url.pathname === '/webhooks/resend/inbound' && request.method === 'POST') {
				response = await handleInboundWebhook({ request, config, inboundDeduper, metadataStore });
			} else {
				response = jsonResponse({ error: 'Not found' }, 404);
			}

			await writeNodeResponse(nodeRes, response);
		} catch (error) {
			const status = error.statusCode || 500;
			await writeNodeResponse(nodeRes, jsonResponse({ error: error.message }, status));
		}
	});
}

async function handleInboundWebhook({ request, config, inboundDeduper, metadataStore }) {
	const rawBody = await request.text();
	const headers = Object.fromEntries(request.headers.entries());
	if (config.resendWebhookSecret && !verifyWebhookSignature({ rawBody, secret: config.resendWebhookSecret, headers })) {
		return jsonResponse({ error: 'Invalid webhook signature' }, 401);
	}

	const body = JSON.parse(rawBody);
	const payload = normalizeResendInboundPayload(body);
	const result = await processInboundEmail({
		payload,
		config,
		deduper: inboundDeduper,
		metadataStore
	});
	return jsonResponse({ ok: true, duplicate: result.duplicate });
}

function normalizeResendInboundPayload(body) {
	const data = body.data || body;
	return {
		eventId: body.id || body.event_id || data.id || data.email_id || '',
		recipient: data.to?.[0]?.email || data.to?.[0] || data.recipient,
		from: data.from?.email || data.from || '',
		to: data.to || [],
		cc: data.cc || [],
		bcc: data.bcc || [],
		subject: data.subject || '',
		text: data.text || data.text_body || '',
		html: data.html || data.html_body || '',
		headers: data.headers || {},
		messageId: data.message_id || data.messageId || '',
		raw: data.raw || data.rawEmail || data.eml || '',
		attachments: data.attachments || [],
		receivedAt: data.created_at || new Date().toISOString()
	};
}

async function toWebRequest(nodeReq, config) {
	const chunks = [];
	for await (const chunk of nodeReq) {
		chunks.push(chunk);
	}
	const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
	return new Request(`http://${config.httpHost}:${config.httpPort}${nodeReq.url}`, {
		method: nodeReq.method,
		headers: nodeReq.headers,
		body
	});
}

async function writeNodeResponse(nodeRes, response) {
	nodeRes.statusCode = response.status;
	for (const [key, value] of response.headers.entries()) {
		nodeRes.setHeader(key, value);
	}
	nodeRes.end(Buffer.from(await response.arrayBuffer()));
}

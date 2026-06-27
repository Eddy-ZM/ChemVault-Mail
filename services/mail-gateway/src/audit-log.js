import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export function createAuditLogger(config) {
	return {
		async write(event) {
			if (config.mainAppInternalUrl && config.internalToken) {
				try {
					await postAuditToMainApp(config, event);
				} catch (error) {
					console.warn(`Audit sync failed: ${error.message}`);
				}
			}
			if (!config.auditLogPath) return;
			await mkdir(path.dirname(config.auditLogPath), { recursive: true });
			const safeEvent = {
				createdAt: new Date().toISOString(),
				appPasswordId: event.appPasswordId || null,
				email: event.email || '',
				eventType: event.eventType || '',
				protocol: event.protocol || '',
				ipAddress: event.ipAddress || '',
				success: Boolean(event.success),
				reason: event.reason || ''
			};
			await appendFile(config.auditLogPath, `${JSON.stringify(safeEvent)}\n`, { mode: 0o600 });
		}
	};
}

async function postAuditToMainApp(config, event) {
	const base = config.mainAppInternalUrl.replace(/\/+$/, '');
	const response = await fetch(`${base}/internal/mail-client/audit`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.internalToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(event)
	});
	if (!response.ok) {
		throw new Error(`Main app audit write failed with ${response.status}`);
	}
}

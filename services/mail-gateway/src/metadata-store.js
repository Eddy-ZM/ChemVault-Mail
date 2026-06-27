import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export function createMetadataStore(config) {
	return {
		async save(metadata) {
			if (config.mainAppInternalUrl && config.internalToken) {
				await postToMainApp(config, metadata);
				return;
			}
			if (!config.metadataStorePath) return;
			await mkdir(path.dirname(config.metadataStorePath), { recursive: true });
			await appendFile(config.metadataStorePath, `${JSON.stringify(metadata)}\n`, { mode: 0o600 });
		}
	};
}

async function postToMainApp(config, metadata) {
	const base = config.mainAppInternalUrl.replace(/\/+$/, '');
	const response = await fetch(`${base}/internal/mail-client/inbound`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.internalToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(metadata)
	});

	if (!response.ok) {
		throw new Error(`Main app inbound metadata write failed with ${response.status}`);
	}
}

import { loadConfig } from './config.js';
import { createFileAuthStore } from './auth-store.js';
import { createAuditLogger } from './audit-log.js';
import { createMemoryInboundDeduper } from './inbound.js';
import { createHttpServer } from './http-server.js';
import { createSubmissionServer } from './smtp-server.js';
import { createMetadataStore } from './metadata-store.js';

const config = loadConfig();
const authStore = createFileAuthStore(config);
const auditLogger = createAuditLogger(config);
const inboundDeduper = createMemoryInboundDeduper();
const metadataStore = createMetadataStore(config);

const httpServer = createHttpServer({ config, authStore, inboundDeduper, metadataStore });
httpServer.listen(config.httpPort, config.httpHost, () => {
	console.log(`ChemVault mail-gateway HTTP listening on ${config.httpHost}:${config.httpPort}`);
});

const smtpServer = await createSubmissionServer({ config, authStore, auditLogger });
smtpServer.listen(config.smtpPort, config.smtpHost, () => {
	console.log(`ChemVault SMTP submission listening on ${config.smtpHost}:${config.smtpPort}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		smtpServer.close();
		httpServer.close(() => process.exit(0));
	});
}

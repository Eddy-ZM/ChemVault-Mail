import { readFile } from 'node:fs/promises';
import { simpleParser } from 'mailparser';
import { SMTPServer } from 'smtp-server';
import { writeMaildirMessage } from './maildir.js';
import { assertEnvelopeAllowed, sendWithResend } from './smtp-policy.js';
import { createLoginRateLimiter, createWindowRateLimiter } from './rate-limit.js';
import { normalizeMailLimits } from './mail-limits.js';

export async function createSubmissionServer({ config, authStore, auditLogger }) {
	const tlsOptions = await loadTlsOptions(config);
	const limiter = createLoginRateLimiter();
	const perMinuteLimiter = createWindowRateLimiter({
		windowMs: 60 * 1000,
		maxAttempts: config.maxEmailsPerMinutePerUser
	});
	const dailyLimiter = createWindowRateLimiter({
		windowMs: 24 * 60 * 60 * 1000,
		maxAttempts: config.dailySmtpLimit
	});
	const mailLimits = normalizeMailLimits(config);

	return new SMTPServer({
		secure: false,
		hideSTARTTLS: !tlsOptions,
		disabledCommands: tlsOptions ? [] : ['STARTTLS'],
		key: tlsOptions?.key,
		cert: tlsOptions?.cert,
		authMethods: ['PLAIN', 'LOGIN'],
		onAuth: async (auth, session, callback) => {
			const email = String(auth.username || '').trim().toLowerCase();
			const rateKey = `${session.remoteAddress || 'unknown'}:${email}`;
			try {
				if (!limiter.check(rateKey)) {
					throw Object.assign(new Error('Too many failed login attempts'), { responseCode: 454 });
				}
				const credential = await authStore.authenticateAppPassword(email, auth.password, 'smtp');
				if (!credential) {
					limiter.recordFailure(rateKey);
					await auditLogger.write({
						eventType: 'auth',
						protocol: 'smtp',
						email,
						ipAddress: session.remoteAddress,
						success: false,
						reason: 'invalid_app_password'
					});
					throw Object.assign(new Error('Invalid username or app password'), { responseCode: 535 });
				}
				limiter.recordSuccess(rateKey);
				await auditLogger.write({
					eventType: 'auth',
					protocol: 'smtp',
					email,
					appPasswordId: credential.id,
					ipAddress: session.remoteAddress,
					success: true
				});
				callback(null, { user: email });
			} catch (error) {
				callback(error);
			}
		},
		onMailFrom: (address, session, callback) => {
			session.envelopeFrom = address.address;
			callback();
		},
		onRcptTo: (address, session, callback) => {
			session.envelopeTo = [...(session.envelopeTo || []), address.address];
			callback();
		},
		onData: async (stream, session, callback) => {
			try {
				const chunks = [];
				for await (const chunk of stream) {
					chunks.push(chunk);
				}
				const raw = Buffer.concat(chunks);
				const parsed = await simpleParser(raw);
				const from = session.envelopeFrom || parsed.from?.value?.[0]?.address;
				const to = session.envelopeTo || parsed.to?.value?.map(item => item.address) || [];
				const sendKey = String(session.user || session.remoteAddress || 'unknown').toLowerCase();
				if (!perMinuteLimiter.check(`minute:${sendKey}`)) {
					throw Object.assign(new Error('Too many messages per minute'), { responseCode: 452 });
				}
				if (!dailyLimiter.check(`day:${sendKey}`)) {
					throw Object.assign(new Error('Daily SMTP sending limit reached'), { responseCode: 452 });
				}
				assertEnvelopeAllowed({
					authenticatedEmail: session.user,
					from,
					to,
					attachments: parsed.attachments || [],
					limits: mailLimits
				});
				await sendWithResend({
					apiKey: config.resendApiKey,
					message: {
						from,
						to,
						subject: parsed.subject || '',
						text: parsed.text || '',
						html: parsed.html || '',
						headers: Object.fromEntries(parsed.headers || [])
					}
				});
				await writeMaildirMessage({
					maildirRoot: config.maildirRoot,
					domain: config.mailDomain,
					email: session.user,
					rawMessage: raw,
					folder: 'Sent'
				});
				callback();
			} catch (error) {
				callback(error);
			}
		}
	});
}

async function loadTlsOptions(config) {
	if (!config.tlsKeyPath || !config.tlsCertPath) {
		return null;
	}
	return {
		key: await readFile(config.tlsKeyPath),
		cert: await readFile(config.tlsCertPath)
	};
}

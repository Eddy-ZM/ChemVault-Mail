// @vitest-environment node

import { describe, expect, it } from 'vitest';
import appConfigService, {
	defaultAppConfig,
	isAllowedRemoteAsset,
 sanitizeTemplateHTML,
	validateAppConfig,
	validateResourceManifest
} from '../src/service/app-config-service.js';

describe('app config service', () => {
	it('falls back to safe defaults when no remote config row exists', async () => {
		const config = await appConfigService.getPublicConfig({
			env: {},
			req: {
				query: () => undefined
			}
		});

		expect(config.platform).toBe('ios');
		expect(config.minimumSupportedVersion).toBe(defaultAppConfig.minimumSupportedVersion);
		expect(config.featureFlags.enableDebugPanel).toBe(false);
		expect(config.links.supportEmail).toBe('support@chemvault.science');
	});

	it('rejects non-https remote URLs and non-App-Store update URLs', () => {
		expect(() => validateAppConfig({
			...defaultAppConfig,
			appStoreUrl: 'https://example.com/app/id123'
		})).toThrow(/App Store/i);

		expect(() => validateAppConfig({
			...defaultAppConfig,
			theme: {
				...defaultAppConfig.theme,
				logoUrl: 'http://assets.chemvault.science/mail/logo.png'
			}
		})).toThrow(/https/i);
	});

	it('blocks executable-like resource assets', () => {
		expect(isAllowedRemoteAsset('https://assets.chemvault.science/mail/logo.png', 'image')).toBe(true);
		expect(isAllowedRemoteAsset('https://assets.chemvault.science/mail/update.jsbundle', 'json')).toBe(false);
		expect(isAllowedRemoteAsset('https://assets.chemvault.science/mail/engine.wasm', 'html')).toBe(false);
	});

	it('validates manifest asset type, https URL, asset host, and sha256 shape', () => {
		const manifest = validateResourceManifest({
			version: '2026-06-26-1',
			assets: [
				{
					key: 'mail_logo',
					type: 'image',
					url: 'https://assets.chemvault.science/mail/logo.png',
					sha256: 'a'.repeat(64),
					required: true
				}
			]
		});

		expect(manifest.assets).toHaveLength(1);

		expect(() => validateResourceManifest({
			version: '2026-06-26-1',
			assets: [
				{
					key: 'bad',
					type: 'image',
					url: 'https://evil.example.com/mail/logo.png',
					sha256: 'a'.repeat(64),
					required: false
				}
			]
		})).toThrow(/asset domain/i);

		expect(() => validateResourceManifest({
			version: '2026-06-26-1',
			assets: [
				{
					key: 'bad',
					type: 'script',
					url: 'https://assets.chemvault.science/mail/update.txt',
					sha256: 'a'.repeat(64),
					required: false
				}
			]
		})).toThrow(/asset type/i);
	});

	it('strips script tags from template HTML', () => {
		const html = '<p>Hello</p><script>alert("x")</script><p>World</p>';

		expect(sanitizeTemplateHTML(html)).toBe('<p>Hello</p><p>World</p>');
	});
});

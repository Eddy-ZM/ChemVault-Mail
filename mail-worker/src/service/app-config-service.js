import BizError from '../error/biz-error';

const ALLOWED_ASSET_DOMAINS = new Set(['assets.chemvault.science']);
const ALLOWED_ASSET_TYPES = new Set(['image', 'json', 'text', 'html']);
const BLOCKED_EXTENSIONS = [
	'.swift',
	'.m',
	'.h',
	'.framework',
	'.dylib',
	'.so',
	'.ipa',
	'.jsbundle',
	'.lua',
	'.py',
	'.wasm',
	'.exe'
];

export const defaultFeatureFlags = {
	enableNewInboxUI: false,
	enableSystemNotifications: true,
	enableBetaMailComposer: false,
	enableCloudflareLogin: true,
	enableDebugPanel: false
};

export const defaultAppConfig = {
	platform: 'ios',
	minimumSupportedVersion: '0.2',
	latestVersion: '0.2',
	forceUpdate: false,
	appStoreUrl: 'https://apps.apple.com/app/idXXXXXXXXXX',
	apiBaseUrl: 'https://mail.chemvault.science/api',
	maintenanceMode: false,
	maintenanceTitle: 'Maintenance',
	maintenanceMessage: 'ChemVault Mail is temporarily under maintenance. Please try again later.',
	announcement: {
		enabled: false,
		title: '',
		message: '',
		link: ''
	},
	featureFlags: defaultFeatureFlags,
	theme: {
		primaryColor: '#FACC15',
		logoUrl: 'https://assets.chemvault.science/mail/logo.png',
		bannerUrl: 'https://assets.chemvault.science/mail/banner.png'
	},
	links: {
		privacyPolicyUrl: 'https://chemvault.science/privacy',
		termsUrl: 'https://chemvault.science/terms',
		helpCenterUrl: 'https://chemvault.science/help',
		supportEmail: 'support@chemvault.science'
	},
	templates: {
		welcomeEmailTemplateVersion: '2026-06-26-1',
		notificationTemplateVersion: '2026-06-26-1'
	},
	resourceManifestUrl: 'https://assets.chemvault.science/mail/manifest.json',
	configVersion: '2026-06-26-1'
};

export const defaultResourceManifest = {
	version: '2026-06-26-1',
	assets: []
};

export const defaultTemplates = {
	version: '2026-06-26-1',
	templates: {
		welcome: {
			subject: 'Welcome to ChemVault Mail',
			body: 'Your ChemVault Mail account is ready.'
		},
		systemNotification: {
			title: 'ChemVault Notification',
			body: 'You have a new system message.'
		}
	}
};

export function sanitizeTemplateHTML(value) {
	return String(value ?? '')
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
		.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
		.replace(/javascript:/gi, '');
}

export function isAllowedRemoteAsset(url, type) {
	if (!ALLOWED_ASSET_TYPES.has(String(type || '').toLowerCase())) return false;
	const parsed = parseHttpsURL(url);
	if (!parsed || !ALLOWED_ASSET_DOMAINS.has(parsed.hostname.toLowerCase())) return false;
	const pathname = parsed.pathname.toLowerCase();
	return !BLOCKED_EXTENSIONS.some(ext => pathname.endsWith(ext) || pathname.includes(`${ext}/`));
}

export function validateAppConfig(input = {}) {
	const config = mergeConfig(defaultAppConfig, input);
	config.platform = normalizeString(config.platform, defaultAppConfig.platform);
	config.minimumSupportedVersion = normalizeString(config.minimumSupportedVersion, defaultAppConfig.minimumSupportedVersion);
	config.latestVersion = normalizeString(config.latestVersion, defaultAppConfig.latestVersion);
	config.forceUpdate = Boolean(config.forceUpdate);
	config.maintenanceMode = Boolean(config.maintenanceMode);
	config.maintenanceTitle = normalizeString(config.maintenanceTitle, defaultAppConfig.maintenanceTitle);
	config.maintenanceMessage = normalizeString(config.maintenanceMessage, defaultAppConfig.maintenanceMessage);
	config.configVersion = normalizeString(config.configVersion, buildConfigVersion());

	validateAppStoreURL(config.appStoreUrl);
	validateHttpsURL(config.apiBaseUrl, 'apiBaseUrl');
	validateHttpsURL(config.theme.logoUrl, 'theme.logoUrl');
	validateHttpsURL(config.theme.bannerUrl, 'theme.bannerUrl');
	validateHttpsURL(config.links.privacyPolicyUrl, 'links.privacyPolicyUrl');
	validateHttpsURL(config.links.termsUrl, 'links.termsUrl');
	validateHttpsURL(config.links.helpCenterUrl, 'links.helpCenterUrl');
	validateHttpsURL(config.resourceManifestUrl, 'resourceManifestUrl');
	validateAssetDomain(config.resourceManifestUrl, 'resourceManifestUrl');

	if (config.announcement?.link) {
		validateHttpsURL(config.announcement.link, 'announcement.link');
	}

	config.announcement = {
		enabled: Boolean(config.announcement?.enabled),
		title: normalizeString(config.announcement?.title, ''),
		message: normalizeString(config.announcement?.message, ''),
		link: normalizeString(config.announcement?.link, '')
	};
	config.featureFlags = normalizeFeatureFlags(config.featureFlags);
	config.theme = {
		primaryColor: normalizeColor(config.theme?.primaryColor, defaultAppConfig.theme.primaryColor),
		logoUrl: normalizeString(config.theme?.logoUrl, defaultAppConfig.theme.logoUrl),
		bannerUrl: normalizeString(config.theme?.bannerUrl, defaultAppConfig.theme.bannerUrl)
	};
	config.links = {
		privacyPolicyUrl: normalizeString(config.links?.privacyPolicyUrl, defaultAppConfig.links.privacyPolicyUrl),
		termsUrl: normalizeString(config.links?.termsUrl, defaultAppConfig.links.termsUrl),
		helpCenterUrl: normalizeString(config.links?.helpCenterUrl, defaultAppConfig.links.helpCenterUrl),
		supportEmail: normalizeSupportEmail(config.links?.supportEmail)
	};
	config.templates = {
		welcomeEmailTemplateVersion: normalizeString(config.templates?.welcomeEmailTemplateVersion, defaultAppConfig.templates.welcomeEmailTemplateVersion),
		notificationTemplateVersion: normalizeString(config.templates?.notificationTemplateVersion, defaultAppConfig.templates.notificationTemplateVersion)
	};
	return config;
}

export function validateResourceManifest(input = {}) {
	const manifest = {
		version: normalizeString(input.version, defaultResourceManifest.version),
		assets: Array.isArray(input.assets) ? input.assets : []
	};

	manifest.assets = manifest.assets.map((asset) => {
		const normalized = {
			key: normalizeString(asset?.key, ''),
			type: normalizeString(asset?.type, '').toLowerCase(),
			url: normalizeString(asset?.url, ''),
			sha256: normalizeString(asset?.sha256, '').toLowerCase(),
			required: Boolean(asset?.required)
		};

		if (!normalized.key) throw new BizError('Resource manifest asset key is required.');
		if (!ALLOWED_ASSET_TYPES.has(normalized.type)) throw new BizError('Invalid resource manifest asset type.');
		validateHttpsURL(normalized.url, `asset ${normalized.key} url`);
		validateAssetDomain(normalized.url, `asset ${normalized.key} url`);
		if (!isAllowedRemoteAsset(normalized.url, normalized.type)) throw new BizError('Resource manifest asset URL is not allowed.');
		if (!/^[a-f0-9]{64}$/i.test(normalized.sha256)) throw new BizError('Resource manifest asset sha256 is invalid.');
		return normalized;
	});

	return manifest;
}

export function validateTemplates(input = {}) {
	const version = normalizeString(input.version, defaultTemplates.version);
	const rawTemplates = input.templates && typeof input.templates === 'object'
		? input.templates
		: defaultTemplates.templates;
	const templates = {};

	for (const [key, value] of Object.entries(rawTemplates)) {
		if (!value || typeof value !== 'object') continue;
		templates[key] = {};
		for (const [field, fieldValue] of Object.entries(value)) {
			templates[key][field] = sanitizeTemplateHTML(fieldValue);
		}
	}

	return {
		version,
		templates: Object.keys(templates).length ? templates : defaultTemplates.templates
	};
}

const appConfigService = {
	async getPublicConfig(c) {
		const platform = c?.req?.query?.('platform') || defaultAppConfig.platform;
		const row = await selectLatestConfig(c, platform);
		return validateAppConfig(rowToConfig(row, platform));
	},

	async getAdminConfig(c) {
		return this.getPublicConfig(c);
	},

	async saveConfig(c, params) {
		await ensureAppConfigTables(c);
		const config = validateAppConfig({
			...params,
			configVersion: params?.configVersion || buildConfigVersion()
		});
		const now = new Date().toISOString();

		await c.env.db.prepare(`
			INSERT INTO app_remote_config (
				platform,
				minimum_supported_version,
				latest_version,
				force_update,
				app_store_url,
				maintenance_mode,
				maintenance_title,
				maintenance_message,
				announcement_json,
				feature_flags_json,
				theme_json,
				links_json,
				api_base_url,
				resource_manifest_url,
				config_version,
				created_at,
				updated_at,
				updated_by
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(platform) DO UPDATE SET
				minimum_supported_version = excluded.minimum_supported_version,
				latest_version = excluded.latest_version,
				force_update = excluded.force_update,
				app_store_url = excluded.app_store_url,
				maintenance_mode = excluded.maintenance_mode,
				maintenance_title = excluded.maintenance_title,
				maintenance_message = excluded.maintenance_message,
				announcement_json = excluded.announcement_json,
				feature_flags_json = excluded.feature_flags_json,
				theme_json = excluded.theme_json,
				links_json = excluded.links_json,
				api_base_url = excluded.api_base_url,
				resource_manifest_url = excluded.resource_manifest_url,
				config_version = excluded.config_version,
				updated_at = excluded.updated_at,
				updated_by = excluded.updated_by
		`).bind(
			config.platform,
			config.minimumSupportedVersion,
			config.latestVersion,
			config.forceUpdate ? 1 : 0,
			config.appStoreUrl,
			config.maintenanceMode ? 1 : 0,
			config.maintenanceTitle,
			config.maintenanceMessage,
			JSON.stringify(config.announcement),
			JSON.stringify(config.featureFlags),
			JSON.stringify(config.theme),
			JSON.stringify(config.links),
			config.apiBaseUrl,
			config.resourceManifestUrl,
			config.configVersion,
			now,
			now,
			getUpdatedBy(c)
		).run();

		return config;
	},

	async getManifest(c) {
		const platform = c?.req?.query?.('platform') || defaultAppConfig.platform;
		const row = await selectLatestManifest(c, platform);
		if (!row) return defaultResourceManifest;
		return validateResourceManifest(parseJSON(row.manifest_json, defaultResourceManifest));
	},

	async saveManifest(c, params) {
		await ensureAppConfigTables(c);
		const platform = normalizeString(params?.platform, defaultAppConfig.platform);
		const manifest = validateResourceManifest(params?.manifest || params);
		const now = new Date().toISOString();

		await c.env.db.prepare(`
			INSERT INTO app_resource_manifest (platform, version, manifest_json, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(platform) DO UPDATE SET
				version = excluded.version,
				manifest_json = excluded.manifest_json,
				updated_at = excluded.updated_at
		`).bind(platform, manifest.version, JSON.stringify(manifest), now, now).run();

		return manifest;
	},

	async getTemplates(c) {
		const platform = c?.req?.query?.('platform') || defaultAppConfig.platform;
		const locale = c?.req?.query?.('locale') || 'en';
		const row = await selectLatestTemplates(c, platform, locale);
		if (!row) return defaultTemplates;
		return validateTemplates(parseJSON(row.template_json, defaultTemplates));
	},

	async saveTemplates(c, params) {
		await ensureAppConfigTables(c);
		const platform = normalizeString(params?.platform, defaultAppConfig.platform);
		const locale = normalizeString(params?.locale, 'en');
		const templateType = normalizeString(params?.templateType || params?.template_type, 'mail');
		const templates = validateTemplates(params?.template || params);
		const now = new Date().toISOString();

		await c.env.db.prepare(`
			INSERT INTO app_templates (platform, locale, template_type, template_json, version, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(platform, locale, template_type) DO UPDATE SET
				template_json = excluded.template_json,
				version = excluded.version,
				updated_at = excluded.updated_at
		`).bind(platform, locale, templateType, JSON.stringify(templates), templates.version, now, now).run();

		return templates;
	}
};

export default appConfigService;

async function ensureAppConfigTables(c) {
	if (!c?.env?.db?.prepare) return;

	await c.env.db.batch([
		c.env.db.prepare(`
			CREATE TABLE IF NOT EXISTS app_remote_config (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				platform TEXT NOT NULL UNIQUE,
				minimum_supported_version TEXT NOT NULL DEFAULT '1.0.0',
				latest_version TEXT NOT NULL DEFAULT '1.0.0',
				force_update INTEGER NOT NULL DEFAULT 0,
				app_store_url TEXT NOT NULL DEFAULT '',
				maintenance_mode INTEGER NOT NULL DEFAULT 0,
				maintenance_title TEXT NOT NULL DEFAULT '',
				maintenance_message TEXT NOT NULL DEFAULT '',
				announcement_json TEXT NOT NULL DEFAULT '{}',
				feature_flags_json TEXT NOT NULL DEFAULT '{}',
				theme_json TEXT NOT NULL DEFAULT '{}',
				links_json TEXT NOT NULL DEFAULT '{}',
				api_base_url TEXT NOT NULL DEFAULT '',
				resource_manifest_url TEXT NOT NULL DEFAULT '',
				config_version TEXT NOT NULL DEFAULT '',
				created_at TEXT NOT NULL DEFAULT '',
				updated_at TEXT NOT NULL DEFAULT '',
				updated_by TEXT NOT NULL DEFAULT ''
			)
		`),
		c.env.db.prepare(`
			CREATE TABLE IF NOT EXISTS app_resource_manifest (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				platform TEXT NOT NULL UNIQUE,
				version TEXT NOT NULL DEFAULT '',
				manifest_json TEXT NOT NULL DEFAULT '{}',
				created_at TEXT NOT NULL DEFAULT '',
				updated_at TEXT NOT NULL DEFAULT ''
			)
		`),
		c.env.db.prepare(`
			CREATE TABLE IF NOT EXISTS app_templates (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				platform TEXT NOT NULL,
				locale TEXT NOT NULL,
				template_type TEXT NOT NULL,
				template_json TEXT NOT NULL DEFAULT '{}',
				version TEXT NOT NULL DEFAULT '',
				created_at TEXT NOT NULL DEFAULT '',
				updated_at TEXT NOT NULL DEFAULT '',
				UNIQUE(platform, locale, template_type)
			)
		`)
	]);
}

async function selectLatestConfig(c, platform) {
	if (!c?.env?.db?.prepare) return null;
	await ensureAppConfigTables(c);
	return c.env.db.prepare(`
		SELECT * FROM app_remote_config
		WHERE platform = ?
		ORDER BY updated_at DESC
		LIMIT 1
	`).bind(platform).first();
}

async function selectLatestManifest(c, platform) {
	if (!c?.env?.db?.prepare) return null;
	await ensureAppConfigTables(c);
	return c.env.db.prepare(`
		SELECT * FROM app_resource_manifest
		WHERE platform = ?
		ORDER BY updated_at DESC
		LIMIT 1
	`).bind(platform).first();
}

async function selectLatestTemplates(c, platform, locale) {
	if (!c?.env?.db?.prepare) return null;
	await ensureAppConfigTables(c);
	const exact = await c.env.db.prepare(`
		SELECT * FROM app_templates
		WHERE platform = ? AND locale = ?
		ORDER BY updated_at DESC
		LIMIT 1
	`).bind(platform, locale).first();
	if (exact) return exact;
	return c.env.db.prepare(`
		SELECT * FROM app_templates
		WHERE platform = ? AND locale = 'en'
		ORDER BY updated_at DESC
		LIMIT 1
	`).bind(platform).first();
}

function rowToConfig(row, platform) {
	if (!row) {
		return {
			...defaultAppConfig,
			platform
		};
	}

	return {
		platform: row.platform || platform,
		minimumSupportedVersion: row.minimum_supported_version,
		latestVersion: row.latest_version,
		forceUpdate: row.force_update === 1,
		appStoreUrl: row.app_store_url,
		apiBaseUrl: row.api_base_url,
		maintenanceMode: row.maintenance_mode === 1,
		maintenanceTitle: row.maintenance_title,
		maintenanceMessage: row.maintenance_message,
		announcement: parseJSON(row.announcement_json, defaultAppConfig.announcement),
		featureFlags: parseJSON(row.feature_flags_json, defaultFeatureFlags),
		theme: parseJSON(row.theme_json, defaultAppConfig.theme),
		links: parseJSON(row.links_json, defaultAppConfig.links),
		resourceManifestUrl: row.resource_manifest_url,
		configVersion: row.config_version
	};
}

function mergeConfig(defaults, input) {
	return {
		...defaults,
		...input,
		announcement: {
			...defaults.announcement,
			...(input?.announcement || {})
		},
		featureFlags: {
			...defaults.featureFlags,
			...(input?.featureFlags || {})
		},
		theme: {
			...defaults.theme,
			...(input?.theme || {})
		},
		links: {
			...defaults.links,
			...(input?.links || {})
		},
		templates: {
			...defaults.templates,
			...(input?.templates || {})
		}
	};
}

function normalizeFeatureFlags(input = {}) {
	return Object.fromEntries(
		Object.entries(defaultFeatureFlags).map(([key, value]) => [key, Boolean(input[key] ?? value)])
	);
}

function normalizeString(value, fallback = '') {
	const normalized = String(value ?? '').trim();
	return normalized || fallback;
}

function normalizeColor(value, fallback) {
	const normalized = normalizeString(value, fallback);
	return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : fallback;
}

function normalizeSupportEmail(value) {
	const normalized = normalizeString(value, defaultAppConfig.links.supportEmail)
		.replace(/^mailto:/i, '')
		.replace(/^\[(.*)\]\(mailto:(.*)\)$/i, '$2')
		.trim();
	return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)
		? normalized
		: defaultAppConfig.links.supportEmail;
}

function parseJSON(value, fallback) {
	if (!value) return fallback;
	if (typeof value === 'object') return value;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

function parseHttpsURL(value) {
	try {
		const url = new URL(String(value ?? '').trim());
		return url.protocol === 'https:' && url.hostname ? url : null;
	} catch {
		return null;
	}
}

function validateHttpsURL(value, label) {
	if (!parseHttpsURL(value)) {
		throw new BizError(`${label} must be a valid https URL.`);
	}
}

function validateAppStoreURL(value) {
	const url = parseHttpsURL(value);
	if (!url || url.hostname.toLowerCase() !== 'apps.apple.com') {
		throw new BizError('App Store URL must use https://apps.apple.com.');
	}
}

function validateAssetDomain(value, label) {
	const url = parseHttpsURL(value);
	if (!url || !ALLOWED_ASSET_DOMAINS.has(url.hostname.toLowerCase())) {
		throw new BizError(`${label} must use an allowed asset domain.`);
	}
}

function buildConfigVersion() {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

function getUpdatedBy(c) {
	try {
		const user = c.get?.('user');
		return user?.email || user?.userId?.toString?.() || '';
	} catch {
		return '';
	}
}

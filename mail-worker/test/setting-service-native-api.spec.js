// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import settingService from '../src/service/setting-service.js';

const { update, set, returning, get } = vi.hoisted(() => ({
	update: vi.fn(),
	set: vi.fn(),
	returning: vi.fn(),
	get: vi.fn()
}));

vi.mock('../src/entity/orm.js', () => ({
	default: () => ({
		update
	})
}));

const originalGet = settingService.get;
const originalQuery = settingService.query;
const originalRefresh = settingService.refresh;

describe('native app API setting', () => {
	afterEach(() => {
		vi.clearAllMocks();
		settingService.get = originalGet;
		settingService.query = originalQuery;
		settingService.refresh = originalRefresh;
	});

	it('exposes the managed Apple API base URL through website config', async () => {
		settingService.get = async () => ({
			register: 0,
			title: 'ChemVault',
			manyEmail: 0,
			addEmail: 0,
			autoRefresh: 5,
			send: 0,
			r2Domain: '',
			siteKey: '',
			background: '',
			loginOpacity: 0.88,
			loginDarkenFactor: 0,
			loginDomain: 0,
			domainList: ['@chemvault.science'],
			appleApiBaseURL: 'https://mail.chemvault.science/api'
		});

		const config = await settingService.websiteConfig({
			env: {},
			req: {
				header: () => '.'
			}
		});

		expect(config.appleApiBaseURL).toBe('https://mail.chemvault.science/api');
	});

	it('normalizes custom deployment origins to API endpoints before saving', async () => {
		get.mockResolvedValue({});
		returning.mockReturnValue({ get });
		set.mockReturnValue({ returning });
		update.mockReturnValue({ set });
		settingService.query = async () => ({ resendTokens: {} });
		settingService.refresh = async () => {};

		await settingService.set({}, {
			appleApiBaseURL: ' https://custom.example.com/ ',
			resendTokens: {}
		});

		expect(set).toHaveBeenCalledWith(expect.objectContaining({
			appleApiBaseURL: 'https://custom.example.com/api'
		}));
	});
});

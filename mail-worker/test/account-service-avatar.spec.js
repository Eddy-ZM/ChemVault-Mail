import { beforeEach, describe, expect, it, vi } from 'vitest';

const { normalize, update, set, where, run } = vi.hoisted(() => ({
	normalize: vi.fn(),
	update: vi.fn(),
	set: vi.fn(),
	where: vi.fn(),
	run: vi.fn()
}));

vi.mock('../src/entity/orm.js', () => ({
	default: () => ({
		update
	})
}));

vi.mock('../src/service/account-avatar-service.js', () => ({
	default: {
		normalize
	}
}));

describe('account service avatar updates', () => {
	let accountService;
	const c = { env: {} };

	beforeEach(async () => {
		vi.clearAllMocks();
		run.mockResolvedValue();
		where.mockReturnValue({ run });
		set.mockReturnValue({ where });
		update.mockReturnValue({ set });
		normalize.mockResolvedValue({ avatarType: 'logo', avatar: '' });
		accountService = (await import('../src/service/account-service.js')).default;
	});

	it('normalizes and stores avatar settings for the account owner', async () => {
		const params = { accountId: 1, avatarType: 'logo', avatar: 'old' };
		const service = {
			...accountService,
			selectById: vi.fn().mockResolvedValue({ accountId: 1, userId: 7 })
		};

		const result = await service.setAvatar(c, params, 7);

		expect(normalize).toHaveBeenCalledWith(c, params);
		expect(set).toHaveBeenCalledWith({ avatarType: 'logo', avatar: '' });
		expect(run).toHaveBeenCalledOnce();
		expect(result).toEqual({ avatarType: 'logo', avatar: '' });
	});

	it('rejects avatar updates for accounts owned by another user', async () => {
		const service = {
			...accountService,
			selectById: vi.fn().mockResolvedValue({ accountId: 1, userId: 8 })
		};

		await expect(service.setAvatar(c, {
			accountId: 1,
			avatarType: 'logo'
		}, 7)).rejects.toMatchObject({ name: 'BizError' });

		expect(normalize).not.toHaveBeenCalled();
		expect(run).not.toHaveBeenCalled();
	});

	it('normalizes and stores avatar settings for a managed user account', async () => {
		const params = { accountId: 2, avatarType: 'logo', avatar: 'old' };
		const service = {
			...accountService,
			selectById: vi.fn().mockResolvedValue({ accountId: 2, userId: 8 })
		};

		const result = await service.setManagedAvatar(c, params);

		expect(service.selectById).toHaveBeenCalledWith(c, 2);
		expect(normalize).toHaveBeenCalledWith(c, params);
		expect(set).toHaveBeenCalledWith({ avatarType: 'logo', avatar: '' });
		expect(run).toHaveBeenCalledOnce();
		expect(result).toEqual({ avatarType: 'logo', avatar: '' });
	});

	it('rejects managed avatar updates when the account does not exist', async () => {
		const service = {
			...accountService,
			selectById: vi.fn().mockResolvedValue(null)
		};

		await expect(service.setManagedAvatar(c, {
			accountId: 2,
			avatarType: 'logo'
		})).rejects.toMatchObject({ name: 'BizError' });

		expect(normalize).not.toHaveBeenCalled();
		expect(run).not.toHaveBeenCalled();
	});
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { putObj } = vi.hoisted(() => ({
	putObj: vi.fn()
}));

vi.mock('../src/service/r2-service.js', () => ({
	default: {
		putObj
	}
}));

describe('account avatar service', () => {
	let service;
	const c = { env: {} };

	beforeEach(async () => {
		vi.clearAllMocks();
		service = (await import('../src/service/account-avatar-service.js')).default;
	});

	it('clears stored avatar when initial mode is selected', async () => {
		const result = await service.normalize(c, {
			avatarType: 'initial',
			avatar: 'https://example.com/old.png'
		});

		expect(result).toEqual({ avatarType: 'initial', avatar: '' });
		expect(putObj).not.toHaveBeenCalled();
	});

	it('clears stored avatar when logo mode is selected', async () => {
		const result = await service.normalize(c, {
			avatarType: 'logo',
			avatar: 'https://example.com/old.png'
		});

		expect(result).toEqual({ avatarType: 'logo', avatar: '' });
		expect(putObj).not.toHaveBeenCalled();
	});

	it('keeps custom image URLs without uploading', async () => {
		const result = await service.normalize(c, {
			avatarType: 'custom',
			avatar: 'https://example.com/avatar.png'
		});

		expect(result).toEqual({
			avatarType: 'custom',
			avatar: 'https://example.com/avatar.png'
		});
		expect(putObj).not.toHaveBeenCalled();
	});

	it('stores custom base64 images and returns an avatar key', async () => {
		const result = await service.normalize(c, {
			avatarType: 'custom',
			avatar: 'data:image/png;base64,YXZhdGFy'
		});

		expect(result.avatarType).toBe('custom');
		expect(result.avatar).toMatch(/^static\/avatar\/[a-f0-9]{32}\.png$/);
		expect(putObj).toHaveBeenCalledOnce();
		expect(putObj.mock.calls[0][1]).toBe(result.avatar);
		expect(putObj.mock.calls[0][3]).toMatchObject({
			contentType: 'image/png',
			cacheControl: 'public, max-age=31536000, immutable'
		});
	});

	it('rejects invalid avatar types', async () => {
		await expect(service.normalize(c, {
			avatarType: 'remote',
			avatar: ''
		})).rejects.toMatchObject({ name: 'BizError' });
	});

	it('rejects empty custom avatars', async () => {
		await expect(service.normalize(c, {
			avatarType: 'custom',
			avatar: ''
		})).rejects.toMatchObject({ name: 'BizError' });
	});
});

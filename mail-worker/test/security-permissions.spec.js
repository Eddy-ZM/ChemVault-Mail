import { describe, expect, it } from 'vitest';
import { permKeyToPaths } from '../src/security/security.js';

describe('avatar permission route mapping', () => {
	it('maps self-service avatar updates to account:set-avatar', () => {
		expect(permKeyToPaths(['account:set-avatar'])).toContain('/account/setAvatar');
	});

	it('maps managed avatar updates to user:set-account-avatar', () => {
		expect(permKeyToPaths(['user:set-account-avatar'])).toEqual(expect.arrayContaining([
			'/user/setAccountAvatar',
			'/user/setUserAvatar'
		]));
	});

	it('maps all-mail read permission to the read-state endpoint used while viewing mail', () => {
		expect(permKeyToPaths(['all-email:query'])).toContain('/email/read');
	});

	it('maps role updates to the Cloudflare Access role selection endpoint', () => {
		expect(permKeyToPaths(['role:set'])).toContain('/role/setCloudflareAccess');
	});
});

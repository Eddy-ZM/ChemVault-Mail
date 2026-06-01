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
});

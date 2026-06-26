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

	it('keeps ChemVault Files permissions as role-only capabilities without mail API routes', () => {
		expect(permKeyToPaths(['files:read', 'files:write', 'files:delete', 'files:share', 'files:manage'])).toEqual([]);
	});

	it('maps app config admin reads and writes to system setting permissions', () => {
		expect(permKeyToPaths(['setting:query'])).toEqual(expect.arrayContaining([
			'/app/admin/config',
			'/app/admin/templates',
			'/app/admin/manifest'
		]));
		expect(permKeyToPaths(['setting:set'])).toEqual(expect.arrayContaining([
			'/app/admin/config/set',
			'/app/admin/templates/set',
			'/app/admin/manifest/set'
		]));
	});
});

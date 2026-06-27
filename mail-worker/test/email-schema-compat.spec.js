// @vitest-environment node

import { describe, expect, it } from 'vitest';
import email from '../src/entity/email.js';

describe('email schema compatibility', () => {
	it('does not select optional mail-client metadata columns in regular mail queries', () => {
		expect(email.headers).toBeUndefined();
		expect(email.attachmentsMetadata).toBeUndefined();
		expect(email.mailboxPath).toBeUndefined();
		expect(email.rawEmlPath).toBeUndefined();
		expect(email.receivedAt).toBeUndefined();
	});
});

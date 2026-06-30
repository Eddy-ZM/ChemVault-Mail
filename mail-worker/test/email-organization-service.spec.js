// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
	normalizeBinaryState,
	normalizeCategory,
	normalizeEmailIds
} from '../src/service/email-organization-service.js';

describe('email organization metadata', () => {
	it('normalizes batch email ids from strings, numbers, and arrays', () => {
		expect(normalizeEmailIds('3,2,2,bad,0,-1')).toEqual([3, 2]);
		expect(normalizeEmailIds(9)).toEqual([9]);
		expect(normalizeEmailIds([1, '4', 'x', 4])).toEqual([1, 4]);
	});

	it('normalizes flag and archive state inputs', () => {
		expect(normalizeBinaryState(undefined)).toBe(1);
		expect(normalizeBinaryState('true')).toBe(1);
		expect(normalizeBinaryState(true)).toBe(1);
		expect(normalizeBinaryState('0')).toBe(0);
		expect(normalizeBinaryState(false)).toBe(0);
	});

	it('keeps category labels compact and safe for display', () => {
		expect(normalizeCategory('  Lab   Orders  ')).toBe('Lab Orders');
		expect(normalizeCategory(null)).toBe('');
		expect(normalizeCategory('a'.repeat(40))).toHaveLength(32);
	});
});

import { describe, expect, it } from 'vitest';
import { LEGACY_PAGE_ALIASES } from '../config/legacyPageAliases.mjs';
import { LEGACY_PRODUCT_ROUTES } from '../config/legacyProductRoutes.mjs';
import {
	EXPLICIT_LEGACY_REDIRECTS,
	LEGACY_PAGE_ALIAS_REDIRECTS,
	LEGACY_REDIRECTS,
} from '../config/legacyRedirects.mjs';

describe('verified legacy redirects', () => {
	it.each([
		['/contact-2', '/contact'],
		['/covid-19-2', '/covid-19'],
		['/privacy-policy-2', '/privacy-policy'],
	])('redirects %s permanently to %s', (source, destination) => {
		expect(EXPLICIT_LEGACY_REDIRECTS).toContainEqual({ source, destination, permanent: true });
	});

	it('loads every evidence-backed page alias as a permanent redirect', () => {
		expect(LEGACY_PAGE_ALIASES).toHaveLength(13);
		expect(LEGACY_PAGE_ALIAS_REDIRECTS).toEqual(
			LEGACY_PAGE_ALIASES.map(({ source, destination }) => ({ source, destination, permanent: true }))
		);
	});

	it('keeps verified product paths separate from semantic redirects', () => {
		expect(LEGACY_PRODUCT_ROUTES).toHaveLength(101);
		expect(LEGACY_REDIRECTS).toHaveLength(16);
	});
});

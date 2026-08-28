import { describe, expect, it } from 'vitest';
import { LEGACY_PRODUCT_ROUTES } from '../config/legacyProductRoutes.mjs';
import { EXPLICIT_LEGACY_REDIRECTS, LEGACY_REDIRECTS } from '../config/legacyRedirects.mjs';

describe('verified legacy redirects', () => {
	it.each([
		['/contact-2', '/contact'],
		['/covid-19-2', '/covid-19'],
		['/privacy-policy-2', '/privacy-policy'],
		['/shop', '/testing-services'],
	])('redirects %s permanently to %s', (source, destination) => {
		expect(EXPLICIT_LEGACY_REDIRECTS).toContainEqual({ source, destination, permanent: true });
	});

	it('keeps verified product paths separate from the four semantic redirects', () => {
		expect(LEGACY_PRODUCT_ROUTES).toHaveLength(101);
		expect(LEGACY_REDIRECTS).toHaveLength(4);
	});
});

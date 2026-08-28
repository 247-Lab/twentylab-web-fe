import { describe, expect, it } from 'vitest';
import { LEGACY_PRODUCT_REDIRECTS } from '../config/legacyProductRedirects.mjs';
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

	it('combines the four explicit aliases with every verified product redirect', () => {
		expect(LEGACY_PRODUCT_REDIRECTS).toHaveLength(101);
		expect(LEGACY_REDIRECTS).toHaveLength(105);
		for (const redirect of LEGACY_PRODUCT_REDIRECTS) {
			expect(LEGACY_REDIRECTS).toContainEqual({ ...redirect, permanent: true });
		}
	});
});

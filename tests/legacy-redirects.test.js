import { describe, expect, it } from 'vitest';
import { LEGACY_REDIRECTS } from '../config/legacyRedirects.mjs';

describe('verified legacy redirects', () => {
	it.each([
		['/contact-2', '/contact'],
		['/covid-19-2', '/covid-19'],
		['/privacy-policy-2', '/privacy-policy'],
		['/shop', '/testing-services'],
	])('redirects %s permanently to %s', (source, destination) => {
		expect(LEGACY_REDIRECTS).toContainEqual({ source, destination, permanent: true });
	});
});

import { describe, expect, it } from 'vitest';

import { legacyRedirectCount, resolveCanonicalRedirect } from '../src/lib/canonicalRedirects';

describe('canonical redirect resolver', () => {
	it.each([
		['/shop', '/testing-services'],
		['/shop/', '/testing-services'],
		['/contact-2/', '/contact'],
		['/product/a-b-hiv/', '/testing-services/28'],
		['/product/a-b-hiv', '/testing-services/28'],
		['/blogs/chlamydia-101/', '/chlamydia-101'],
		['/blogs/chlamydia-101', '/chlamydia-101'],
		['/contact/', '/contact'],
	])('resolves %s directly to %s', (source, destination) => {
		expect(resolveCanonicalRedirect(source)).toBe(destination);
	});

	it.each(['/', '/contact', '/api/health/', '/wp-content/uploads/image/', '/favicon.ico/'])(
		'leaves %s unchanged',
		(path) => {
			expect(resolveCanonicalRedirect(path)).toBeNull();
		}
	);

	it('loads every explicit and verified product alias once', () => {
		expect(legacyRedirectCount()).toBe(105);
	});

	it.each(['relative', '//other.example/path', '/path?secret=1', '/path#fragment', '/bad\\path'])(
		'rejects an invalid pathname: %s',
		(path) => {
			expect(() => resolveCanonicalRedirect(path)).toThrow('CANONICAL_REDIRECT_PATH_INVALID');
		}
	);
});

import { describe, expect, it } from 'vitest';
import { normalizeBlogSlug, toCanonicalBlogPath, toLegacyAppBlogPath } from '../src/lib/blogRoutes';

describe('blog route contract', () => {
	it('keeps historical root slugs canonical', () => {
		expect(normalizeBlogSlug('  Chlamydia-101 ')).toBe('chlamydia-101');
		expect(toCanonicalBlogPath('chlamydia-101')).toBe('/chlamydia-101');
		expect(toLegacyAppBlogPath('chlamydia-101')).toBe('/blogs/chlamydia-101');
	});

	it.each(['', '/', '../private', 'contains space', 'café', 'slug/child'])('rejects an unsafe slug: %s', (slug) => {
		expect(() => normalizeBlogSlug(slug)).toThrow('BLOG_SLUG_INVALID');
	});
});

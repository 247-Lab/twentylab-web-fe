const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeBlogSlug(slug) {
	const normalized = String(slug || '')
		.trim()
		.toLowerCase();

	if (!BLOG_SLUG_PATTERN.test(normalized)) {
		throw new Error('BLOG_SLUG_INVALID');
	}

	return normalized;
}

export function toCanonicalBlogPath(slug) {
	return `/${normalizeBlogSlug(slug)}`;
}

export function toLegacyAppBlogPath(slug) {
	return `/blogs/${normalizeBlogSlug(slug)}`;
}

import { LEGACY_REDIRECTS } from '../../config/legacyRedirects.mjs';
import { canonicalProductPathForId, canonicalProductPathForPathname } from './productRoutes';

const BLOG_PATH_PATTERN = /^\/blogs\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;
const NUMERIC_PRODUCT_PATH_PATTERN = /^\/testing-services\/([1-9][0-9]*)\/?$/;
const redirectByPath = new Map();

function normalizedAliasPath(path) {
	return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

function validateRedirectPath(path, code) {
	if (
		typeof path !== 'string' ||
		!path.startsWith('/') ||
		path.includes('?') ||
		path.includes('#') ||
		path.includes('\\') ||
		path.includes('//')
	) {
		throw new Error(code);
	}
	return path;
}

for (const redirect of LEGACY_REDIRECTS) {
	const source = normalizedAliasPath(validateRedirectPath(redirect.source, 'LEGACY_REDIRECT_SOURCE_INVALID'));
	const destination = validateRedirectPath(redirect.destination, 'LEGACY_REDIRECT_DESTINATION_INVALID');
	if (source === destination || redirectByPath.has(source)) {
		throw new Error('LEGACY_REDIRECT_MAP_INVALID');
	}
	redirectByPath.set(source, destination);
}

function shouldPreserveTrailingSlash(pathname) {
	if (
		pathname.startsWith('/_next/') ||
		pathname.startsWith('/api/') ||
		pathname.startsWith('/wp-content/uploads/') ||
		pathname.startsWith('/.well-known/')
	) {
		return true;
	}
	const finalSegment = pathname.slice(pathname.lastIndexOf('/') + 1) || pathname.slice(0, -1).split('/').pop();
	return finalSegment?.includes('.') ?? false;
}

export function resolveCanonicalRedirect(pathname) {
	validateRedirectPath(pathname, 'CANONICAL_REDIRECT_PATH_INVALID');
	if (pathname === '/') return null;

	const aliasPath = normalizedAliasPath(pathname);
	const canonicalProductPath = canonicalProductPathForPathname(pathname);
	if (canonicalProductPath) return pathname === canonicalProductPath ? null : canonicalProductPath;
	const numericProductMatch = NUMERIC_PRODUCT_PATH_PATTERN.exec(pathname);
	if (numericProductMatch) {
		const stableProductPath = canonicalProductPathForId(numericProductMatch[1]);
		if (stableProductPath) return stableProductPath;
	}

	const explicitDestination = redirectByPath.get(aliasPath);
	if (explicitDestination) return explicitDestination;

	const blogMatch = BLOG_PATH_PATTERN.exec(pathname);
	if (blogMatch) return `/${blogMatch[1]}`;

	if (pathname.endsWith('/') && !shouldPreserveTrailingSlash(pathname)) {
		return pathname.slice(0, -1);
	}
	return null;
}

export function legacyRedirectCount() {
	return redirectByPath.size;
}

import { ENDPOINTS } from './api';
import { SENSITIVE_NOINDEX_ROUTES } from './publicRoutes';

const DEFAULT_METADATA = {
	title: '24-7 Labs',
	description: '',
};

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://24-7labs.com').replace(/\/$/, '');
const SENSITIVE_NOINDEX_PATHS = new Set(SENSITIVE_NOINDEX_ROUTES);

export function normalizePath(path) {
	const normalized = `/${String(path || '/')
		.trim()
		.replace(/^\/+/, '')
		.replace(/\/+$/, '')}`;

	return normalized === '/' ? '/' : normalized;
}

export const normalizeRedirectPath = normalizePath;

export function buildMetadata(meta, fallback = DEFAULT_METADATA, requestedPath = meta?.path || '/') {
	const path = normalizePath(requestedPath);
	const robots = SENSITIVE_NOINDEX_PATHS.has(path)
		? {
				index: false,
				follow: false,
				nocache: true,
				googleBot: {
					index: false,
					follow: false,
					noimageindex: true,
				},
			}
		: undefined;

	return {
		title: meta?.title || fallback.title || DEFAULT_METADATA.title,
		description: meta?.description || fallback.description || DEFAULT_METADATA.description,
		alternates: {
			canonical: path,
		},
		...(robots ? { robots } : {}),
	};
}

export function buildMetadataUrl(endpoint, path) {
	const url = new URL(endpoint);
	url.searchParams.set('path', normalizePath(path));
	return url.toString();
}

// Server-side helper for the intentionally public, single-path SEO endpoint.
// The list endpoint is administrator-only and must never be used by public pages.
export async function fetchMetadata(path, { endpoint, fetchImplementation = fetch } = {}) {
	try {
		const url = buildMetadataUrl(endpoint || ENDPOINTS.SEO, path);

		const res = await fetchImplementation(url, {
			next: { revalidate: 60 },
			signal: AbortSignal.timeout(5000),
		});

		if (!res.ok) return null;
		const json = await res.json();
		return json && typeof json === 'object' && !Array.isArray(json) ? json : null;
	} catch {
		// Swallow and return null so pages can use route-specific fallback metadata.
		return null;
	}
}

export async function resolveMetadata(path, fallback) {
	const meta = await fetchMetadata(path);
	return buildMetadata(meta, fallback, path);
}

// Returns an async `generateMetadata` function bound to `path` for easy reuse in pages
export function generateMetadataForPath(path) {
	return async function generateMetadata() {
		return resolveMetadata(path);
	};
}

// Generic factory: accepts either a static path string or a mapper function
// The mapper receives the same context object Next passes to `generateMetadata`, e.g. { params, searchParams }
export function generateMetadataFor(pathOrMapper) {
	if (typeof pathOrMapper === 'string') return generateMetadataForPath(pathOrMapper);
	return async function generateMetadata(ctx) {
		const resolved = typeof pathOrMapper === 'function' ? pathOrMapper(ctx) : pathOrMapper;
		return resolveMetadata(resolved);
	};
}

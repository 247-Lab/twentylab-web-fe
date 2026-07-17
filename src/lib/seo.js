import { ENDPOINTS } from './api';

const DEFAULT_METADATA = {
	title: '24-7 Labs',
	description: '',
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

function normalizePath(path) {
	const normalized = `/${String(path || '/')
		.trim()
		.replace(/^\/+/, '')
		.replace(/\/+$/, '')}`;

	return normalized === '/' ? '/' : normalized;
}

function toMetadata(meta, fallback = DEFAULT_METADATA) {
	return {
		title: meta?.title || fallback.title || DEFAULT_METADATA.title,
		description: meta?.description || fallback.description || DEFAULT_METADATA.description,
	};
}

export async function fetchAllMetadata() {
	try {
		const url = `${ENDPOINTS.SEO}/all`;

		const res = await fetch(url, { next: { revalidate: 60 } });

		if (!res.ok) return null;
		const json = await res.json();
		return Array.isArray(json) ? json : [];
	} catch (err) {
		// swallow and return null so pages can fallback
		return null;
	}
}

// Server-side helper to resolve SEO metadata from the backend list API.
export async function fetchMetadata(path) {
	const rows = await fetchAllMetadata();
	const normalizedPath = normalizePath(path);

	return rows?.find((entry) => normalizePath(entry?.path) === normalizedPath) || null;
}

export async function resolveMetadata(path, fallback) {
	const meta = await fetchMetadata(path);
	return toMetadata(meta, fallback);
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

import { LEGACY_PRODUCT_ROUTES } from '../../config/legacyProductRoutes.mjs';

const PRODUCT_PATH_PATTERN = /^\/product\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/;
const PRODUCT_ID_PATTERN = /^[1-9][0-9]*$/;
const routeBySlug = new Map();
const routeByProductId = new Map();

for (const route of LEGACY_PRODUCT_ROUTES) {
	const match = typeof route.path === 'string' ? PRODUCT_PATH_PATTERN.exec(route.path) : null;
	const productId = String(route.productId);
	if (
		!match ||
		!Number.isSafeInteger(route.productId) ||
		route.productId < 1 ||
		routeBySlug.has(match[1]) ||
		routeByProductId.has(productId)
	) {
		throw new Error('LEGACY_PRODUCT_ROUTE_MAP_INVALID');
	}
	const normalized = Object.freeze({ path: route.path, slug: match[1], productId: route.productId });
	routeBySlug.set(normalized.slug, normalized);
	routeByProductId.set(productId, normalized);
}

export function legacyProductRouteForSlug(slug) {
	if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
	return routeBySlug.get(slug) ?? null;
}

export function canonicalProductPathForPathname(pathname) {
	if (typeof pathname !== 'string') return null;
	const aliasPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
	const match = PRODUCT_PATH_PATTERN.exec(aliasPath);
	return match ? (routeBySlug.get(match[1])?.path ?? null) : null;
}

export function canonicalProductPathForId(id) {
	return routeByProductId.get(String(id))?.path ?? null;
}

export function toProductDetailPath(id) {
	const productId = String(id);
	if (!PRODUCT_ID_PATTERN.test(productId)) throw new Error('PRODUCT_ROUTE_ID_INVALID');
	return canonicalProductPathForId(productId) ?? `/testing-services/${productId}`;
}

export function legacyProductRouteCount() {
	return routeBySlug.size;
}

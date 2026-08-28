import { describe, expect, it } from 'vitest';

import {
	canonicalProductPathForId,
	canonicalProductPathForPathname,
	legacyProductRouteCount,
	legacyProductRouteForSlug,
	toProductDetailPath,
} from '../src/lib/productRoutes';

describe('stable product routes', () => {
	it('resolves the verified legacy slug and imported product ID in both directions', () => {
		expect(legacyProductRouteForSlug('a-b-hiv')).toEqual({
			path: '/product/a-b-hiv/',
			slug: 'a-b-hiv',
			productId: 28,
		});
		expect(canonicalProductPathForId(28)).toBe('/product/a-b-hiv/');
		expect(canonicalProductPathForPathname('/product/a-b-hiv')).toBe('/product/a-b-hiv/');
		expect(canonicalProductPathForPathname('/product/a-b-hiv/')).toBe('/product/a-b-hiv/');
		expect(toProductDetailPath(28)).toBe('/product/a-b-hiv/');
		expect(canonicalProductPathForId(117)).toBe('/product/hair-10-panel-drug-test/');
	});

	it('keeps an unmapped imported product on the numeric fallback route', () => {
		expect(canonicalProductPathForId(999)).toBeNull();
		expect(toProductDetailPath(999)).toBe('/testing-services/999');
	});

	it.each(['', 'A-B-HIV', '../private', 'contains space'])('rejects an unsafe or unknown slug: %s', (slug) => {
		expect(legacyProductRouteForSlug(slug)).toBeNull();
	});

	it.each(['', 0, -1, '01', 'not-an-id'])('rejects an unsafe product ID: %s', (id) => {
		expect(() => toProductDetailPath(id)).toThrow('PRODUCT_ROUTE_ID_INVALID');
	});

	it('contains every exact legacy product mapping once', () => {
		expect(legacyProductRouteCount()).toBe(102);
	});
});

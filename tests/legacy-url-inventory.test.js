import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
	buildLegacySourceInventory,
	buildSourceRecord,
	extractSitemapLocations,
	validateLegacySourceInventory,
	validateLegacyUrlContract,
} from '../scripts/legacy-url-inventory-lib.mjs';
import { INDEXABLE_STATIC_ROUTES, SENSITIVE_NOINDEX_ROUTES } from '../src/lib/publicRoutes';

function xml(...locations) {
	return `<?xml version="1.0"?><urlset>${locations.map((location) => `<url><loc>${location}</loc></url>`).join('')}</urlset>`;
}

function imageXml(...locations) {
	return `<?xml version="1.0"?><urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${locations
		.map(
			(location) =>
				`<url><loc>https://24-7labs.com/source-page/</loc><image:image><image:loc>${location}</image:loc></image:image></url>`
		)
		.join('')}</urlset>`;
}

function fixture() {
	const pages = buildSourceRecord({
		kind: 'pages',
		endpoint: 'https://24-7labs.com/sitemap.xml',
		contentType: 'text/xml',
		body: xml('https://24-7labs.com/', 'https://24-7labs.com/contact/'),
	});
	const images = buildSourceRecord({
		kind: 'images',
		endpoint: 'https://24-7labs.com/image-sitemap.xml',
		contentType: 'application/xml',
		body: imageXml(
			'https://24-7labs.com/wp-content/uploads/logo.png',
			'https://24-7labs.com/wp-content/uploads/logo.png'
		),
	});
	return buildLegacySourceInventory({ capturedAt: '2026-08-27T12:00:00.000Z', pageSource: pages, imageSource: images });
}

describe('legacy URL source inventory', () => {
	it('extracts XML entities and preserves the observed-versus-unique distinction', () => {
		expect(extractSitemapLocations(xml('https://24-7labs.com/a&amp;b/'))).toEqual(['https://24-7labs.com/a&b/']);
		const inventory = fixture();
		expect(inventory.sources.images.observed_location_count).toBe(2);
		expect(inventory.sources.images.empty_location_count).toBe(0);
		expect(inventory.sources.images.unique_url_count).toBe(1);
		expect(() => validateLegacySourceInventory(inventory)).not.toThrow();
	});

	it('records malformed empty locations without inventing a URL', () => {
		const source = buildSourceRecord({
			kind: 'pages',
			endpoint: 'https://24-7labs.com/sitemap.xml',
			contentType: 'text/xml',
			body: xml('', 'https://24-7labs.com/contact/'),
		});
		expect(source).toMatchObject({
			observed_location_count: 2,
			empty_location_count: 1,
			unique_url_count: 1,
		});
	});

	it('extracts image namespace locations rather than their outer page locations', () => {
		const body = `<?xml version="1.0"?><urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://24-7labs.com/page/</loc><image:image><image:loc>https://24-7labs.com/wp-content/uploads/photo.png</image:loc></image:image></url></urlset>`;
		const source = buildSourceRecord({
			kind: 'images',
			endpoint: 'https://24-7labs.com/image-sitemap.xml',
			contentType: 'text/xml',
			body,
		});
		expect(source.paths).toEqual(['/wp-content/uploads/photo.png']);
	});

	it.each([
		'https://example.com/contact/',
		'https://24-7labs.com/contact/?campaign=1',
		'https://user@24-7labs.com/contact/',
	])('rejects sitemap locations outside the fixed public URL boundary: %s', (location) => {
		expect(() =>
			buildSourceRecord({
				kind: 'pages',
				endpoint: 'https://24-7labs.com/sitemap.xml',
				contentType: 'text/xml',
				body: xml(location),
			})
		).toThrow('LEGACY_SITEMAP_LOCATION_BOUNDARY_INVALID');
	});

	it('rejects an image sitemap entry outside the approved legacy media prefix', () => {
		expect(() =>
			buildSourceRecord({
				kind: 'images',
				endpoint: 'https://24-7labs.com/image-sitemap.xml',
				contentType: 'text/xml',
				body: imageXml('https://24-7labs.com/private/customer.png'),
			})
		).toThrow('LEGACY_IMAGE_PATH_BOUNDARY_INVALID');
	});

	it('detects any edit to the sorted source path set', () => {
		const inventory = fixture();
		inventory.sources.pages.paths[0] = '/tampered/';
		expect(() => validateLegacySourceInventory(inventory)).toThrow('LEGACY_SOURCE_RECORD_PATH_ORDER_INVALID');
	});

	it('keeps the release gate closed until every source, page, and media path is reviewed', () => {
		const inventory = fixture();
		const contract = {
			schema_version: 1,
			source_set_sha256: inventory.source_set_sha256,
			status: 'review_required',
			page_classifications: [],
			asset_preservation: {
				status: 'review_required',
				path_prefix: '/wp-content/uploads/',
				validated_unique_path_count: 0,
				origin_behavior: 'not_configured',
			},
		};
		expect(validateLegacyUrlContract(contract, inventory)).toMatchObject({
			complete: false,
			unclassifiedPageCount: 2,
			uniqueImagePathCount: 1,
		});
	});

	it('rejects redirect chains and loops', () => {
		const inventory = fixture();
		const contract = {
			schema_version: 1,
			source_set_sha256: inventory.source_set_sha256,
			status: 'review_required',
			page_classifications: [
				{ path: '/', disposition: 'redirect', destination: '/contact/' },
				{ path: '/contact/', disposition: 'redirect', destination: '/' },
			],
			asset_preservation: {
				status: 'review_required',
				path_prefix: '/wp-content/uploads/',
				validated_unique_path_count: 0,
				origin_behavior: 'not_configured',
			},
		};
		expect(() => validateLegacyUrlContract(contract, inventory)).toThrow('LEGACY_URL_CONTRACT_REDIRECT_LOOP');
	});

	it('validates the checked-in source inventory and its intentionally incomplete contract', async () => {
		const inventory = JSON.parse(
			await readFile(new URL('../config/legacy-url-source-inventory.json', import.meta.url))
		);
		const contract = JSON.parse(await readFile(new URL('../config/legacy-url-contract.json', import.meta.url)));
		expect(() => validateLegacySourceInventory(inventory)).not.toThrow();
		expect(validateLegacyUrlContract(contract, inventory)).toMatchObject({
			complete: false,
			classifiedPageCount: 246,
			unclassifiedPageCount: 30,
		});
		expect(contract.page_classifications).toHaveLength(246);

		const exactApplicationPaths = new Set([
			...INDEXABLE_STATIC_ROUTES.map(({ path }) => path),
			...SENSITIVE_NOINDEX_ROUTES,
		]);
		const exactRouteEntries = contract.page_classifications.filter(
			(entry) => entry.path === '/' || exactApplicationPaths.has(entry.path.slice(0, -1))
		);
		expect(exactRouteEntries).toHaveLength(16);
		expect(exactRouteEntries).toContainEqual({ path: '/', disposition: 'preserve' });
		for (const entry of exactRouteEntries.filter(({ path }) => path !== '/')) {
			expect(entry).toEqual({ path: entry.path, disposition: 'redirect', destination: entry.path.slice(0, -1) });
		}

		const productEntries = contract.page_classifications.filter(({ path }) => path.startsWith('/product/'));
		expect(productEntries).toHaveLength(101);
		for (const entry of productEntries) {
			expect(entry).toEqual({
				path: expect.stringMatching(/^\/product\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/),
				disposition: 'preserve',
			});
		}

		const blogEntries = contract.page_classifications.filter(
			(entry) => !exactRouteEntries.includes(entry) && !productEntries.includes(entry)
		);
		expect(blogEntries).toHaveLength(129);
		for (const entry of blogEntries) {
			expect(entry).toEqual({
				path: expect.stringMatching(/^\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/),
				disposition: 'redirect',
				destination: entry.path.slice(0, -1),
			});
		}
	});
});

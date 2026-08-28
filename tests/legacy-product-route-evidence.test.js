import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
	buildLegacyProductRouteEvidence,
	extractLegacyProductFacts,
	validateLegacyProductRouteEvidence,
	validateProductEvidenceContract,
} from '../scripts/legacy-product-route-evidence-lib.mjs';
import { buildLegacySourceInventory, buildSourceRecord } from '../scripts/legacy-url-inventory-lib.mjs';
import { resolveCanonicalRedirect } from '../src/lib/canonicalRedirects';

function inventoryFixture() {
	const pageSource = buildSourceRecord({
		kind: 'pages',
		endpoint: 'https://24-7labs.com/sitemap.xml',
		contentType: 'text/xml',
		body: '<?xml version="1.0"?><urlset><url><loc>https://24-7labs.com/product/example/</loc></url></urlset>',
	});
	const imageSource = buildSourceRecord({
		kind: 'images',
		endpoint: 'https://24-7labs.com/image-sitemap.xml',
		contentType: 'text/xml',
		body: '<?xml version="1.0"?><urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><image:image><image:loc>https://24-7labs.com/wp-content/uploads/example.png</image:loc></image:image></url></urlset>',
	});
	return buildLegacySourceInventory({
		capturedAt: '2026-08-28T12:00:00.000Z',
		pageSource,
		imageSource,
	});
}

function factsFixture() {
	return extractLegacyProductFacts({
		path: '/product/example/',
		status: 200,
		contentType: 'text/html; charset=utf-8',
		body: '<html><script type="application/ld+json">{"@type":"Product","url":"https://24-7labs.com/product/example/","name":"Example &amp; Test","sku":"EX-1","offers":{"price":"10.00"}}</script></html>',
	});
}

function catalogFixture() {
	return {
		schema_version: 1,
		source_database_sha256: '5462ff2be8913b29385e0e74816963617db5f4149f5888ce2da8bbc829694772',
		source_database_size_bytes: 695773,
		products: [
			{
				id: 7,
				name: 'Example & Test',
				regular_price: '10.00',
				sale_price: null,
				published: true,
				visible: true,
				variant_of: null,
			},
		],
	};
}

describe('legacy product route evidence', () => {
	it('binds a public Product record to the final database by exact normalized name', () => {
		const inventory = inventoryFixture();
		const evidence = buildLegacyProductRouteEvidence({
			capturedAt: '2026-08-28T12:30:00.000Z',
			inventory,
			catalog: catalogFixture(),
			facts: [factsFixture()],
		});
		expect(validateLegacyProductRouteEvidence(evidence, inventory)).toBe(evidence);
		expect(evidence).toMatchObject({ matched_product_count: 1, unresolved_product_count: 0 });
		expect(evidence.mappings[0]).toMatchObject({
			path: '/product/example/',
			match_basis: 'normalized_exact_english_name',
			target_product_id: 7,
			price_comparison: 'match',
		});
	});

	it('accepts the one reviewed number-token equivalence only with an exact price and unique live target', () => {
		const pageSource = buildSourceRecord({
			kind: 'pages',
			endpoint: 'https://24-7labs.com/sitemap.xml',
			contentType: 'text/xml',
			body: '<?xml version="1.0"?><urlset><url><loc>https://24-7labs.com/product/hair-10-panel-drug-test/</loc></url></urlset>',
		});
		const imageSource = buildSourceRecord({
			kind: 'images',
			endpoint: 'https://24-7labs.com/image-sitemap.xml',
			contentType: 'text/xml',
			body: '<?xml version="1.0"?><urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><image:image><image:loc>https://24-7labs.com/wp-content/uploads/hair-test.png</image:loc></image:image></url></urlset>',
		});
		const inventory = buildLegacySourceInventory({
			capturedAt: '2026-08-28T12:00:00.000Z',
			pageSource,
			imageSource,
		});
		const facts = extractLegacyProductFacts({
			path: '/product/hair-10-panel-drug-test/',
			status: 200,
			contentType: 'text/html',
			body: '<html><script type="application/ld+json">{"@type":"Product","url":"https://24-7labs.com/product/hair-10-panel-drug-test/","name":"Hair Ten Panel Drug Test","sku":"13387","offers":{"price":"299.00"}}</script></html>',
		});
		const catalog = {
			schema_version: 1,
			source_database_sha256: '5462ff2be8913b29385e0e74816963617db5f4149f5888ce2da8bbc829694772',
			source_database_size_bytes: 695773,
			products: [
				{
					id: 117,
					name: 'Hair 10 Panel Drug Test',
					regular_price: '299.00',
					sale_price: null,
					published: true,
					visible: true,
					variant_of: null,
				},
			],
		};
		const evidence = buildLegacyProductRouteEvidence({
			capturedAt: '2026-08-28T12:30:00.000Z',
			inventory,
			catalog,
			facts: [facts],
		});
		expect(validateLegacyProductRouteEvidence(evidence, inventory)).toBe(evidence);
		expect(evidence.mappings[0]).toMatchObject({
			match_basis: 'reviewed_name_price_equivalence',
			target_product_id: 117,
			price_comparison: 'match',
		});

		const wrongPriceCatalog = structuredClone(catalog);
		wrongPriceCatalog.products[0].regular_price = '298.00';
		expect(() =>
			buildLegacyProductRouteEvidence({
				capturedAt: '2026-08-28T12:30:00.000Z',
				inventory,
				catalog: wrongPriceCatalog,
				facts: [facts],
			})
		).toThrow('LEGACY_PRODUCT_EQUIVALENCE_TARGET_INVALID');

		const ambiguousCatalog = structuredClone(catalog);
		ambiguousCatalog.products.push({ ...structuredClone(catalog.products[0]), id: 118 });
		expect(() =>
			buildLegacyProductRouteEvidence({
				capturedAt: '2026-08-28T12:30:00.000Z',
				inventory,
				catalog: ambiguousCatalog,
				facts: [facts],
			})
		).toThrow('LEGACY_PRODUCT_EQUIVALENCE_TARGET_INVALID');
	});

	it('detects evidence tampering', () => {
		const inventory = inventoryFixture();
		const evidence = buildLegacyProductRouteEvidence({
			capturedAt: '2026-08-28T12:30:00.000Z',
			inventory,
			catalog: catalogFixture(),
			facts: [factsFixture()],
		});
		evidence.mappings[0].target_product_id = 8;
		expect(() => validateLegacyProductRouteEvidence(evidence, inventory)).toThrow(
			'LEGACY_PRODUCT_EVIDENCE_SET_INVALID'
		);
	});

	it('validates the checked-in evidence and its exact contract bindings', async () => {
		const [inventory, evidence, contract] = await Promise.all(
			[
				'../config/legacy-url-source-inventory.json',
				'../config/legacy-product-route-evidence.json',
				'../config/legacy-url-contract.json',
			].map(async (path) => JSON.parse(await readFile(new URL(path, import.meta.url))))
		);
		expect(() => validateLegacyProductRouteEvidence(evidence, inventory)).not.toThrow();
		expect(validateProductEvidenceContract(evidence, contract)).toBe(true);
		expect(evidence).toMatchObject({ matched_product_count: 102, unresolved_product_count: 3 });
		expect(evidence.mappings.filter(({ price_comparison }) => price_comparison === 'drift')).toHaveLength(4);
		expect(evidence.mappings.filter(({ match_basis }) => match_basis === 'reviewed_name_price_equivalence')).toEqual([
			expect.objectContaining({ path: '/product/hair-10-panel-drug-test/', target_product_id: 117 }),
		]);
		for (const mapping of evidence.mappings) {
			expect(resolveCanonicalRedirect(mapping.path)).toBeNull();
			expect(resolveCanonicalRedirect(mapping.path.slice(0, -1))).toBe(mapping.path);
			expect(resolveCanonicalRedirect(`/testing-services/${mapping.target_product_id}`)).toBe(mapping.path);
		}
	});
});

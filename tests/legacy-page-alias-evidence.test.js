import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { LEGACY_PAGE_ALIASES } from '../config/legacyPageAliases.mjs';
import {
	buildLegacyPageAliasEvidence,
	extractLegacyPageAliasFacts,
	validateLegacyPageAliasEvidence,
	validatePageAliasEvidenceContract,
} from '../scripts/legacy-page-alias-evidence-lib.mjs';
import { buildLegacySourceInventory, buildSourceRecord } from '../scripts/legacy-url-inventory-lib.mjs';
import { resolveCanonicalRedirect } from '../src/lib/canonicalRedirects';

const fixtureAliases = [
	{
		source: '/about-us/',
		destination: '/about',
		matchBasis: 'renamed_company_page',
	},
];

function inventoryFixture() {
	const pageSource = buildSourceRecord({
		kind: 'pages',
		endpoint: 'https://24-7labs.com/sitemap.xml',
		contentType: 'text/xml',
		body: '<?xml version="1.0"?><urlset><url><loc>https://24-7labs.com/about-us/</loc></url></urlset>',
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
	return extractLegacyPageAliasFacts({
		path: '/about-us/',
		status: 200,
		contentType: 'text/html; charset=utf-8',
		body: '<html><head><title>About 24-7 Labs &amp; Team</title><link rel="canonical" href="https://24-7labs.com/about-us/"></head><body><h1>About Us</h1></body></html>',
	});
}

describe('legacy page alias evidence', () => {
	it('binds captured public identity facts to a reviewed application route', () => {
		const inventory = inventoryFixture();
		const evidence = buildLegacyPageAliasEvidence({
			capturedAt: '2026-08-28T12:30:00.000Z',
			inventory,
			facts: [factsFixture()],
			aliases: fixtureAliases,
		});
		expect(validateLegacyPageAliasEvidence(evidence, inventory, fixtureAliases)).toBe(evidence);
		expect(evidence.mappings[0]).toMatchObject({
			path: '/about-us/',
			source_title: 'About 24-7 Labs & Team',
			destination: '/about',
			target_indexing: 'indexable',
		});
	});

	it('rejects altered captured source facts', () => {
		const inventory = inventoryFixture();
		const evidence = buildLegacyPageAliasEvidence({
			capturedAt: '2026-08-28T12:30:00.000Z',
			inventory,
			facts: [factsFixture()],
			aliases: fixtureAliases,
		});
		evidence.mappings[0].source_title = 'Different page';
		expect(() => validateLegacyPageAliasEvidence(evidence, inventory, fixtureAliases)).toThrow(
			'LEGACY_PAGE_ALIAS_EVIDENCE_MAPPING_INVALID'
		);
	});

	it('validates every checked-in alias against evidence, the URL contract, and the runtime resolver', async () => {
		const [inventory, evidence, contract] = await Promise.all(
			[
				'../config/legacy-url-source-inventory.json',
				'../config/legacy-page-alias-evidence.json',
				'../config/legacy-url-contract.json',
			].map(async (path) => JSON.parse(await readFile(new URL(path, import.meta.url))))
		);
		expect(() => validateLegacyPageAliasEvidence(evidence, inventory)).not.toThrow();
		expect(validatePageAliasEvidenceContract(evidence, contract)).toBe(true);
		expect(evidence.mapping_count).toBe(LEGACY_PAGE_ALIASES.length);
		for (const mapping of evidence.mappings) {
			expect(resolveCanonicalRedirect(mapping.path)).toBe(mapping.destination);
			expect(resolveCanonicalRedirect(mapping.path.slice(0, -1))).toBe(mapping.destination);
		}
	});
});

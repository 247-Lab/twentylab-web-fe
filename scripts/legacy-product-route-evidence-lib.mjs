import { createHash } from 'node:crypto';

import { LEGACY_SITE_ORIGIN, validateLegacySourceInventory } from './legacy-url-inventory-lib.mjs';

export const FINAL_DATABASE_SHA256 = '5462ff2be8913b29385e0e74816963617db5f4149f5888ce2da8bbc829694772';
export const FINAL_DATABASE_SIZE_BYTES = 695773;
export const PRODUCT_MATCH_POLICY = 'normalized_exact_english_name_prefer_unique_parent_v1';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PRICE_PATTERN = /^(?:0|[1-9][0-9]{0,7})\.[0-9]{2}$/;
const LEGACY_SKU_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const PRODUCT_PATH_PATTERN = /^\/product\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;

function fail(code) {
	throw new Error(code);
}

function exactKeys(value, expected, code) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
	const actual = Object.keys(value).sort();
	const expectedSorted = [...expected].sort();
	if (JSON.stringify(actual) !== JSON.stringify(expectedSorted)) fail(code);
}

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function decodeHtmlEntityPass(value) {
	return value.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/giu, (entity, code) => {
		switch (code.toLowerCase()) {
			case 'amp':
				return '&';
			case 'lt':
				return '<';
			case 'gt':
				return '>';
			case 'quot':
				return '"';
			case 'apos':
				return "'";
			default: {
				const hexadecimal = code.toLowerCase().startsWith('#x');
				const number = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
				if (!Number.isSafeInteger(number) || number < 0 || number > 0x10ffff) {
					fail('LEGACY_PRODUCT_HTML_ENTITY_INVALID');
				}
				return String.fromCodePoint(number);
			}
		}
	});
}

export function decodeLegacyProductName(value) {
	if (typeof value !== 'string' || !value.trim() || value.length > 500) {
		fail('LEGACY_PRODUCT_NAME_INVALID');
	}
	let decoded = value;
	for (let pass = 0; pass < 4; pass += 1) {
		const next = decodeHtmlEntityPass(decoded);
		if (next === decoded) break;
		decoded = next;
	}
	if (/&(?:#x?[0-9a-f]+|[a-z]+);/iu.test(decoded)) fail('LEGACY_PRODUCT_HTML_ENTITY_UNSUPPORTED');
	return decoded.trim();
}

export function normalizeLegacyProductName(value) {
	return decodeLegacyProductName(value)
		.normalize('NFKC')
		.replace(/[‘’]/gu, "'")
		.replace(/\s+/gu, ' ')
		.trim()
		.toLowerCase();
}

function normalizePrice(value, { nullable = false } = {}) {
	if (value === null && nullable) return null;
	if (typeof value !== 'string' || !PRICE_PATTERN.test(value)) fail('LEGACY_PRODUCT_PRICE_INVALID');
	return value;
}

function normalizeLegacyProductPath(path) {
	if (typeof path !== 'string' || !PRODUCT_PATH_PATTERN.test(path)) fail('LEGACY_PRODUCT_PATH_INVALID');
	return path;
}

function productFactsHash(facts) {
	return sha256(
		JSON.stringify({
			path: facts.path,
			legacy_name: facts.legacy_name,
			legacy_sku: facts.legacy_sku,
			legacy_prices: facts.legacy_prices,
		})
	);
}

function collectProductEntries(document) {
	const roots = Array.isArray(document) ? document : [document];
	const entries = [];
	for (const root of roots) {
		if (!root || typeof root !== 'object' || Array.isArray(root)) continue;
		entries.push(root);
		if (Array.isArray(root['@graph'])) entries.push(...root['@graph']);
	}
	return entries.filter((entry) => {
		const type = entry?.['@type'];
		return type === 'Product' || (Array.isArray(type) && type.includes('Product'));
	});
}

function collectOfferPrices(offers) {
	const prices = [];
	for (const offer of Array.isArray(offers) ? offers : [offers]) {
		if (!offer || typeof offer !== 'object' || Array.isArray(offer)) continue;
		const specifications = Array.isArray(offer.priceSpecification)
			? offer.priceSpecification
			: [offer.priceSpecification];
		const candidates = [offer.price, ...specifications.map((entry) => entry?.price)];
		for (const candidate of candidates) {
			if (candidate === undefined || candidate === null || candidate === '') continue;
			prices.push(normalizePrice(String(candidate)));
		}
	}
	return [...new Set(prices)].sort();
}

export function extractLegacyProductFacts({ path, status, contentType, body }) {
	const normalizedPath = normalizeLegacyProductPath(path);
	if (status !== 200 || typeof contentType !== 'string' || !contentType.toLowerCase().includes('html')) {
		fail('LEGACY_PRODUCT_RESPONSE_INVALID');
	}
	if (typeof body !== 'string' || !body || Buffer.byteLength(body, 'utf8') > 2 * 1024 * 1024) {
		fail('LEGACY_PRODUCT_RESPONSE_BODY_INVALID');
	}

	const products = [];
	for (const match of body.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/giu)) {
		let document;
		try {
			document = JSON.parse(match[1]);
		} catch {
			continue;
		}
		products.push(...collectProductEntries(document));
	}
	if (products.length !== 1) fail('LEGACY_PRODUCT_JSONLD_AMBIGUOUS');
	const product = products[0];
	if (typeof product.url !== 'string') fail('LEGACY_PRODUCT_JSONLD_URL_INVALID');
	let productUrl;
	try {
		productUrl = new URL(product.url);
	} catch {
		fail('LEGACY_PRODUCT_JSONLD_URL_INVALID');
	}
	if (
		productUrl.origin !== LEGACY_SITE_ORIGIN ||
		productUrl.pathname !== normalizedPath ||
		productUrl.search ||
		productUrl.hash
	) {
		fail('LEGACY_PRODUCT_JSONLD_URL_INVALID');
	}

	const legacyName = decodeLegacyProductName(product.name);
	const legacySku = String(product.sku ?? '');
	if (!LEGACY_SKU_PATTERN.test(legacySku)) fail('LEGACY_PRODUCT_SKU_INVALID');
	const facts = {
		path: normalizedPath,
		legacy_sku: legacySku,
		legacy_name: legacyName,
		legacy_prices: collectOfferPrices(product.offers),
	};
	return Object.freeze({ ...facts, legacy_facts_sha256: productFactsHash(facts) });
}

function validateCatalog(catalog) {
	exactKeys(
		catalog,
		['schema_version', 'source_database_sha256', 'source_database_size_bytes', 'products'],
		'LEGACY_PRODUCT_CATALOG_SHAPE_INVALID'
	);
	if (
		catalog.schema_version !== 1 ||
		catalog.source_database_sha256 !== FINAL_DATABASE_SHA256 ||
		catalog.source_database_size_bytes !== FINAL_DATABASE_SIZE_BYTES ||
		!Array.isArray(catalog.products) ||
		catalog.products.length === 0
	) {
		fail('LEGACY_PRODUCT_CATALOG_SOURCE_INVALID');
	}
	const ids = new Set();
	for (const product of catalog.products) {
		exactKeys(
			product,
			['id', 'name', 'regular_price', 'sale_price', 'published', 'visible', 'variant_of'],
			'LEGACY_PRODUCT_CATALOG_ENTRY_INVALID'
		);
		if (!Number.isSafeInteger(product.id) || product.id < 1 || ids.has(product.id)) {
			fail('LEGACY_PRODUCT_CATALOG_ID_INVALID');
		}
		ids.add(product.id);
		normalizeLegacyProductName(product.name);
		normalizePrice(product.regular_price);
		normalizePrice(product.sale_price, { nullable: true });
		if (
			typeof product.published !== 'boolean' ||
			typeof product.visible !== 'boolean' ||
			(product.variant_of !== null && (!Number.isSafeInteger(product.variant_of) || product.variant_of < 1))
		) {
			fail('LEGACY_PRODUCT_CATALOG_ENTRY_INVALID');
		}
	}
	for (const product of catalog.products) {
		if (product.variant_of !== null && !ids.has(product.variant_of)) fail('LEGACY_PRODUCT_CATALOG_PARENT_INVALID');
	}
	return catalog;
}

function priceComparison(facts, product) {
	if (facts.legacy_prices.length === 0) return 'not_available';
	return facts.legacy_prices.includes(product.sale_price || product.regular_price) ? 'match' : 'drift';
}

function mappingDigest(mappings, unresolved) {
	return sha256(JSON.stringify({ mappings, unresolved }));
}

export function buildLegacyProductRouteEvidence({ capturedAt, inventory, catalog, facts }) {
	validateLegacySourceInventory(inventory);
	validateCatalog(catalog);
	if (typeof capturedAt !== 'string' || !Number.isFinite(Date.parse(capturedAt))) {
		fail('LEGACY_PRODUCT_EVIDENCE_CAPTURE_TIME_INVALID');
	}
	const expectedPaths = inventory.sources.pages.paths.filter((path) => path.startsWith('/product/'));
	if (!Array.isArray(facts) || facts.length !== expectedPaths.length) fail('LEGACY_PRODUCT_FACTS_COUNT_INVALID');
	const factsByPath = new Map();
	for (const entry of facts) {
		const path = normalizeLegacyProductPath(entry?.path);
		if (factsByPath.has(path) || !expectedPaths.includes(path)) fail('LEGACY_PRODUCT_FACTS_PATH_INVALID');
		if (
			!LEGACY_SKU_PATTERN.test(entry.legacy_sku) ||
			!Array.isArray(entry.legacy_prices) ||
			entry.legacy_prices.some((price) => normalizePrice(price) !== price) ||
			entry.legacy_facts_sha256 !== productFactsHash(entry)
		) {
			fail('LEGACY_PRODUCT_FACTS_INVALID');
		}
		normalizeLegacyProductName(entry.legacy_name);
		factsByPath.set(path, entry);
	}

	const mappings = [];
	const unresolved = [];
	for (const path of expectedPaths) {
		const legacy = factsByPath.get(path);
		const candidates = catalog.products.filter(
			(product) =>
				product.published &&
				product.visible &&
				normalizeLegacyProductName(product.name) === normalizeLegacyProductName(legacy.legacy_name)
		);
		const parents = candidates.filter((product) => product.variant_of === null);
		const target = parents.length === 1 ? parents[0] : candidates.length === 1 ? candidates[0] : null;
		if (!target) {
			unresolved.push({
				...legacy,
				reason: candidates.length === 0 ? 'no_exact_name_match' : 'ambiguous_exact_name_match',
			});
			continue;
		}
		mappings.push({
			...legacy,
			target_product_id: target.id,
			target_name: target.name,
			target_regular_price: target.regular_price,
			target_sale_price: target.sale_price,
			price_comparison: priceComparison(legacy, target),
		});
	}
	mappings.sort((left, right) => left.path.localeCompare(right.path));
	unresolved.sort((left, right) => left.path.localeCompare(right.path));

	return {
		schema_version: 1,
		site_origin: LEGACY_SITE_ORIGIN,
		captured_at: capturedAt,
		legacy_source_set_sha256: inventory.source_set_sha256,
		source_database_sha256: catalog.source_database_sha256,
		source_database_size_bytes: catalog.source_database_size_bytes,
		match_policy: PRODUCT_MATCH_POLICY,
		mapping_set_sha256: mappingDigest(mappings, unresolved),
		matched_product_count: mappings.length,
		unresolved_product_count: unresolved.length,
		mappings,
		unresolved,
	};
}

function validateStoredFacts(entry) {
	normalizeLegacyProductPath(entry.path);
	if (
		!LEGACY_SKU_PATTERN.test(entry.legacy_sku) ||
		!Array.isArray(entry.legacy_prices) ||
		entry.legacy_prices.some((price) => normalizePrice(price) !== price) ||
		!SHA256_PATTERN.test(entry.legacy_facts_sha256) ||
		entry.legacy_facts_sha256 !== productFactsHash(entry)
	) {
		fail('LEGACY_PRODUCT_EVIDENCE_FACTS_INVALID');
	}
	normalizeLegacyProductName(entry.legacy_name);
}

export function validateLegacyProductRouteEvidence(evidence, inventory) {
	validateLegacySourceInventory(inventory);
	exactKeys(
		evidence,
		[
			'schema_version',
			'site_origin',
			'captured_at',
			'legacy_source_set_sha256',
			'source_database_sha256',
			'source_database_size_bytes',
			'match_policy',
			'mapping_set_sha256',
			'matched_product_count',
			'unresolved_product_count',
			'mappings',
			'unresolved',
		],
		'LEGACY_PRODUCT_EVIDENCE_SHAPE_INVALID'
	);
	if (
		evidence.schema_version !== 1 ||
		evidence.site_origin !== LEGACY_SITE_ORIGIN ||
		!Number.isFinite(Date.parse(evidence.captured_at)) ||
		evidence.legacy_source_set_sha256 !== inventory.source_set_sha256 ||
		evidence.source_database_sha256 !== FINAL_DATABASE_SHA256 ||
		evidence.source_database_size_bytes !== FINAL_DATABASE_SIZE_BYTES ||
		evidence.match_policy !== PRODUCT_MATCH_POLICY ||
		!SHA256_PATTERN.test(evidence.mapping_set_sha256) ||
		!Array.isArray(evidence.mappings) ||
		!Array.isArray(evidence.unresolved)
	) {
		fail('LEGACY_PRODUCT_EVIDENCE_IDENTITY_INVALID');
	}
	if (
		evidence.matched_product_count !== evidence.mappings.length ||
		evidence.unresolved_product_count !== evidence.unresolved.length
	) {
		fail('LEGACY_PRODUCT_EVIDENCE_COUNT_INVALID');
	}

	const expectedPaths = inventory.sources.pages.paths.filter((path) => path.startsWith('/product/'));
	const observedPaths = new Set();
	const targetIds = new Set();
	for (const mapping of evidence.mappings) {
		exactKeys(
			mapping,
			[
				'path',
				'legacy_sku',
				'legacy_name',
				'legacy_prices',
				'legacy_facts_sha256',
				'target_product_id',
				'target_name',
				'target_regular_price',
				'target_sale_price',
				'price_comparison',
			],
			'LEGACY_PRODUCT_EVIDENCE_MAPPING_SHAPE_INVALID'
		);
		validateStoredFacts(mapping);
		if (
			observedPaths.has(mapping.path) ||
			targetIds.has(mapping.target_product_id) ||
			!Number.isSafeInteger(mapping.target_product_id) ||
			mapping.target_product_id < 1 ||
			normalizeLegacyProductName(mapping.legacy_name) !== normalizeLegacyProductName(mapping.target_name)
		) {
			fail('LEGACY_PRODUCT_EVIDENCE_MAPPING_INVALID');
		}
		normalizePrice(mapping.target_regular_price);
		normalizePrice(mapping.target_sale_price, { nullable: true });
		if (
			mapping.price_comparison !==
			priceComparison(mapping, {
				regular_price: mapping.target_regular_price,
				sale_price: mapping.target_sale_price,
			})
		) {
			fail('LEGACY_PRODUCT_EVIDENCE_PRICE_COMPARISON_INVALID');
		}
		observedPaths.add(mapping.path);
		targetIds.add(mapping.target_product_id);
	}
	for (const unresolved of evidence.unresolved) {
		exactKeys(
			unresolved,
			['path', 'legacy_sku', 'legacy_name', 'legacy_prices', 'legacy_facts_sha256', 'reason'],
			'LEGACY_PRODUCT_EVIDENCE_UNRESOLVED_SHAPE_INVALID'
		);
		validateStoredFacts(unresolved);
		if (
			observedPaths.has(unresolved.path) ||
			!['no_exact_name_match', 'ambiguous_exact_name_match'].includes(unresolved.reason)
		) {
			fail('LEGACY_PRODUCT_EVIDENCE_UNRESOLVED_INVALID');
		}
		observedPaths.add(unresolved.path);
	}
	if (
		observedPaths.size !== expectedPaths.length ||
		expectedPaths.some((path) => !observedPaths.has(path)) ||
		JSON.stringify(evidence.mappings.map(({ path }) => path)) !==
			JSON.stringify([...evidence.mappings.map(({ path }) => path)].sort()) ||
		JSON.stringify(evidence.unresolved.map(({ path }) => path)) !==
			JSON.stringify([...evidence.unresolved.map(({ path }) => path)].sort()) ||
		evidence.mapping_set_sha256 !== mappingDigest(evidence.mappings, evidence.unresolved)
	) {
		fail('LEGACY_PRODUCT_EVIDENCE_SET_INVALID');
	}
	return evidence;
}

export function validateProductEvidenceContract(evidence, contract) {
	const byPath = new Map(contract.page_classifications.map((entry) => [entry.path, entry]));
	for (const mapping of evidence.mappings) {
		const entry = byPath.get(mapping.path);
		if (!entry || entry.disposition !== 'preserve' || Object.keys(entry).length !== 2) {
			fail('LEGACY_PRODUCT_EVIDENCE_CONTRACT_MISMATCH');
		}
	}
	for (const unresolved of evidence.unresolved) {
		if (byPath.has(unresolved.path)) fail('LEGACY_PRODUCT_UNRESOLVED_PATH_CLASSIFIED');
	}
	return true;
}

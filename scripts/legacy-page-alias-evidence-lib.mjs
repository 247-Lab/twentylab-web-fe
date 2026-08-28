import { createHash } from 'node:crypto';

import { LEGACY_PAGE_ALIASES } from '../config/legacyPageAliases.mjs';
import { INDEXABLE_STATIC_ROUTES, SENSITIVE_NOINDEX_ROUTES } from '../config/publicRoutes.mjs';
import { LEGACY_SITE_ORIGIN, validateLegacySourceInventory } from './legacy-url-inventory-lib.mjs';

export const LEGACY_PAGE_ALIAS_REVIEW_POLICY = 'manual_semantic_route_review_v1';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const LEGACY_PAGE_PATH_PATTERN = /^\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
const MATCH_BASES = new Set([
	'renamed_company_page',
	'renamed_form_page',
	'renamed_listing_page',
	'renamed_policy_page',
	'renamed_service_page',
	'renamed_trust_page',
]);

function fail(code) {
	throw new Error(code);
}

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function exactKeys(value, expected, code) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
	const actual = Object.keys(value).sort();
	const expectedSorted = [...expected].sort();
	if (JSON.stringify(actual) !== JSON.stringify(expectedSorted)) fail(code);
}

function decodeHtmlEntities(value) {
	return value.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/giu, (entity, code) => {
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
			case 'nbsp':
				return ' ';
			default: {
				const hexadecimal = code.toLowerCase().startsWith('#x');
				const number = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
				if (!Number.isSafeInteger(number) || number < 0 || number > 0x10ffff) {
					fail('LEGACY_PAGE_ALIAS_HTML_ENTITY_INVALID');
				}
				return String.fromCodePoint(number);
			}
		}
	});
}

function normalizeVisibleText(value, { nullable = false } = {}) {
	if (value === null && nullable) return null;
	if (typeof value !== 'string') fail('LEGACY_PAGE_ALIAS_TEXT_INVALID');
	const normalized = decodeHtmlEntities(value.replace(/<[^>]*>/gu, ' '))
		.replace(/\s+/gu, ' ')
		.trim();
	if (!normalized || normalized.length > 500) fail('LEGACY_PAGE_ALIAS_TEXT_INVALID');
	return normalized;
}

function attributeValue(tag, name) {
	const expression = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'iu');
	const match = expression.exec(tag);
	return match ? decodeHtmlEntities(match[1] ?? match[2]) : null;
}

function normalizeSourcePath(path) {
	if (typeof path !== 'string' || !LEGACY_PAGE_PATH_PATTERN.test(path) || path.startsWith('/product/')) {
		fail('LEGACY_PAGE_ALIAS_SOURCE_INVALID');
	}
	return path;
}

function targetRoutes() {
	const routes = new Map();
	for (const route of INDEXABLE_STATIC_ROUTES) {
		routes.set(route.path, { title: route.title, indexing: 'indexable' });
	}
	for (const path of SENSITIVE_NOINDEX_ROUTES) {
		routes.set(path, { title: path.slice(1).replaceAll('-', ' '), indexing: 'noindex' });
	}
	return routes;
}

function validateReviewedAliases(aliases = LEGACY_PAGE_ALIASES) {
	if (!Array.isArray(aliases) || aliases.length === 0) fail('LEGACY_PAGE_ALIAS_REVIEW_INVALID');
	const sources = new Set();
	const targets = targetRoutes();
	for (const alias of aliases) {
		exactKeys(alias, ['source', 'destination', 'matchBasis'], 'LEGACY_PAGE_ALIAS_REVIEW_SHAPE_INVALID');
		const source = normalizeSourcePath(alias.source);
		if (
			sources.has(source) ||
			!targets.has(alias.destination) ||
			!MATCH_BASES.has(alias.matchBasis) ||
			source === alias.destination ||
			alias.destination.endsWith('/')
		) {
			fail('LEGACY_PAGE_ALIAS_REVIEW_INVALID');
		}
		sources.add(source);
	}
	if (
		JSON.stringify(aliases.map(({ source }) => source)) !==
		JSON.stringify([...aliases.map(({ source }) => source)].sort())
	) {
		fail('LEGACY_PAGE_ALIAS_REVIEW_ORDER_INVALID');
	}
	return aliases;
}

function sourceIdentityHash(facts) {
	return sha256(
		JSON.stringify({
			path: facts.path,
			source_status: facts.source_status,
			source_title: facts.source_title,
			source_h1: facts.source_h1,
			source_canonical: facts.source_canonical,
		})
	);
}

export function extractLegacyPageAliasFacts({ path, status, contentType, body }) {
	const normalizedPath = normalizeSourcePath(path);
	if (status !== 200 || typeof contentType !== 'string' || !contentType.toLowerCase().includes('html')) {
		fail('LEGACY_PAGE_ALIAS_RESPONSE_INVALID');
	}
	if (typeof body !== 'string' || !body || Buffer.byteLength(body, 'utf8') > 2 * 1024 * 1024) {
		fail('LEGACY_PAGE_ALIAS_RESPONSE_BODY_INVALID');
	}

	const titleMatches = [...body.matchAll(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/giu)];
	if (titleMatches.length !== 1) fail('LEGACY_PAGE_ALIAS_TITLE_INVALID');
	const sourceTitle = normalizeVisibleText(titleMatches[0][1]);
	const h1Match = /<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/iu.exec(body);
	const sourceH1 = h1Match ? normalizeVisibleText(h1Match[1], { nullable: true }) : null;

	const canonicalLinks = [...body.matchAll(/<link\b[^>]*>/giu)].filter((match) => {
		const rel = attributeValue(match[0], 'rel');
		return rel?.toLowerCase().split(/\s+/u).includes('canonical');
	});
	if (canonicalLinks.length !== 1) fail('LEGACY_PAGE_ALIAS_CANONICAL_INVALID');
	const canonicalHref = attributeValue(canonicalLinks[0][0], 'href');
	let canonical;
	try {
		canonical = new URL(canonicalHref);
	} catch {
		fail('LEGACY_PAGE_ALIAS_CANONICAL_INVALID');
	}
	if (
		canonical.origin !== LEGACY_SITE_ORIGIN ||
		canonical.pathname !== normalizedPath ||
		canonical.search ||
		canonical.hash
	) {
		fail('LEGACY_PAGE_ALIAS_CANONICAL_INVALID');
	}

	const facts = {
		path: normalizedPath,
		source_status: status,
		source_title: sourceTitle,
		source_h1: sourceH1,
		source_canonical: canonical.toString(),
	};
	return Object.freeze({ ...facts, source_identity_sha256: sourceIdentityHash(facts) });
}

function mappingSetHash(mappings) {
	return sha256(JSON.stringify(mappings));
}

export function buildLegacyPageAliasEvidence({ capturedAt, inventory, facts, aliases = LEGACY_PAGE_ALIASES }) {
	validateLegacySourceInventory(inventory);
	validateReviewedAliases(aliases);
	if (typeof capturedAt !== 'string' || !Number.isFinite(Date.parse(capturedAt))) {
		fail('LEGACY_PAGE_ALIAS_CAPTURE_TIME_INVALID');
	}
	if (!Array.isArray(facts) || facts.length !== aliases.length) fail('LEGACY_PAGE_ALIAS_FACTS_COUNT_INVALID');

	const sourcePaths = new Set(inventory.sources.pages.paths);
	const factsByPath = new Map();
	for (const entry of facts) {
		const path = normalizeSourcePath(entry?.path);
		if (!sourcePaths.has(path) || factsByPath.has(path)) fail('LEGACY_PAGE_ALIAS_FACTS_PATH_INVALID');
		if (entry.source_identity_sha256 !== sourceIdentityHash(entry)) fail('LEGACY_PAGE_ALIAS_FACTS_INVALID');
		factsByPath.set(path, entry);
	}

	const targets = targetRoutes();
	const mappings = aliases.map((alias) => {
		const sourceFacts = factsByPath.get(alias.source);
		if (!sourceFacts) fail('LEGACY_PAGE_ALIAS_FACTS_MISSING');
		const target = targets.get(alias.destination);
		return {
			...sourceFacts,
			destination: alias.destination,
			target_route_title: target.title,
			target_indexing: target.indexing,
			match_basis: alias.matchBasis,
		};
	});

	return {
		schema_version: 1,
		site_origin: LEGACY_SITE_ORIGIN,
		captured_at: capturedAt,
		legacy_source_set_sha256: inventory.source_set_sha256,
		review_policy: LEGACY_PAGE_ALIAS_REVIEW_POLICY,
		mapping_set_sha256: mappingSetHash(mappings),
		mapping_count: mappings.length,
		mappings,
	};
}

export function validateLegacyPageAliasEvidence(evidence, inventory, aliases = LEGACY_PAGE_ALIASES) {
	validateLegacySourceInventory(inventory);
	validateReviewedAliases(aliases);
	exactKeys(
		evidence,
		[
			'schema_version',
			'site_origin',
			'captured_at',
			'legacy_source_set_sha256',
			'review_policy',
			'mapping_set_sha256',
			'mapping_count',
			'mappings',
		],
		'LEGACY_PAGE_ALIAS_EVIDENCE_SHAPE_INVALID'
	);
	if (
		evidence.schema_version !== 1 ||
		evidence.site_origin !== LEGACY_SITE_ORIGIN ||
		!Number.isFinite(Date.parse(evidence.captured_at)) ||
		evidence.legacy_source_set_sha256 !== inventory.source_set_sha256 ||
		evidence.review_policy !== LEGACY_PAGE_ALIAS_REVIEW_POLICY ||
		!SHA256_PATTERN.test(evidence.mapping_set_sha256) ||
		!Array.isArray(evidence.mappings) ||
		evidence.mapping_count !== evidence.mappings.length ||
		evidence.mapping_count !== aliases.length
	) {
		fail('LEGACY_PAGE_ALIAS_EVIDENCE_IDENTITY_INVALID');
	}

	const expectedByPath = new Map(aliases.map((alias) => [alias.source, alias]));
	const targets = targetRoutes();
	const observed = new Set();
	for (const mapping of evidence.mappings) {
		exactKeys(
			mapping,
			[
				'path',
				'source_status',
				'source_title',
				'source_h1',
				'source_canonical',
				'source_identity_sha256',
				'destination',
				'target_route_title',
				'target_indexing',
				'match_basis',
			],
			'LEGACY_PAGE_ALIAS_EVIDENCE_MAPPING_SHAPE_INVALID'
		);
		const alias = expectedByPath.get(mapping.path);
		const target = targets.get(mapping.destination);
		if (
			!alias ||
			observed.has(mapping.path) ||
			mapping.source_status !== 200 ||
			mapping.source_identity_sha256 !== sourceIdentityHash(mapping) ||
			mapping.destination !== alias.destination ||
			mapping.match_basis !== alias.matchBasis ||
			mapping.target_route_title !== target?.title ||
			mapping.target_indexing !== target?.indexing
		) {
			fail('LEGACY_PAGE_ALIAS_EVIDENCE_MAPPING_INVALID');
		}
		normalizeVisibleText(mapping.source_title);
		if (mapping.source_h1 !== null) normalizeVisibleText(mapping.source_h1);
		if (mapping.source_canonical !== `${LEGACY_SITE_ORIGIN}${mapping.path}`) {
			fail('LEGACY_PAGE_ALIAS_EVIDENCE_MAPPING_INVALID');
		}
		observed.add(mapping.path);
	}
	if (
		evidence.mapping_set_sha256 !== mappingSetHash(evidence.mappings) ||
		JSON.stringify(evidence.mappings.map(({ path }) => path)) !== JSON.stringify(aliases.map(({ source }) => source))
	) {
		fail('LEGACY_PAGE_ALIAS_EVIDENCE_SET_INVALID');
	}
	return evidence;
}

export function validatePageAliasEvidenceContract(evidence, contract) {
	const byPath = new Map(contract.page_classifications.map((entry) => [entry.path, entry]));
	for (const mapping of evidence.mappings) {
		const entry = byPath.get(mapping.path);
		if (
			!entry ||
			entry.disposition !== 'redirect' ||
			entry.destination !== mapping.destination ||
			Object.keys(entry).length !== 3
		) {
			fail('LEGACY_PAGE_ALIAS_EVIDENCE_CONTRACT_MISMATCH');
		}
	}
	return true;
}

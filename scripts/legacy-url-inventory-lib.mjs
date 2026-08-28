import { createHash } from 'node:crypto';

export const LEGACY_SITE_ORIGIN = 'https://24-7labs.com';

export const LEGACY_SITEMAP_SOURCES = Object.freeze({
	pages: Object.freeze({
		endpoint: `${LEGACY_SITE_ORIGIN}/sitemap.xml`,
		pathPrefix: '/',
	}),
	images: Object.freeze({
		endpoint: `${LEGACY_SITE_ORIGIN}/image-sitemap.xml`,
		pathPrefix: '/wp-content/uploads/',
	}),
});

export const REQUIRED_LEGACY_EVIDENCE_SOURCES = Object.freeze([
	'wordpress_public_sitemaps',
	'wordpress_database',
	'web_server_redirect_rules',
	'search_console',
	'analytics',
	'backlink_inventory',
	'campaign_destinations',
	'access_logs',
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function decodeXmlEntities(value) {
	const decoded = value.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (entity, code) => {
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
				const radix = code.toLowerCase().startsWith('#x') ? 16 : 10;
				const number = Number.parseInt(code.slice(radix === 16 ? 2 : 1), radix);
				if (!Number.isSafeInteger(number) || number < 0 || number > 0x10ffff) {
					throw new Error('LEGACY_SITEMAP_XML_ENTITY_INVALID');
				}
				return String.fromCodePoint(number);
			}
		}
	});

	if (/&[^;\s]+;/.test(decoded)) {
		throw new Error('LEGACY_SITEMAP_XML_ENTITY_UNSUPPORTED');
	}
	return decoded;
}

export function extractSitemapLocations(xml, { kind = 'pages' } = {}) {
	if (typeof xml !== 'string' || !/<(?:urlset|sitemapindex)(?:\s|>)/i.test(xml)) {
		throw new Error('LEGACY_SITEMAP_XML_ROOT_INVALID');
	}

	if (!['pages', 'images'].includes(kind)) throw new Error('LEGACY_SITEMAP_KIND_INVALID');
	const tag = kind === 'images' ? 'image:loc' : 'loc';
	const expression = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
	const locations = [];
	for (const match of xml.matchAll(expression)) {
		const value = decodeXmlEntities(match[1].trim());
		locations.push(value);
	}
	if (locations.length === 0) throw new Error('LEGACY_SITEMAP_LOCATIONS_MISSING');
	return locations;
}

export function normalizeLegacyLocation(location, { kind }) {
	let url;
	try {
		url = new URL(location);
	} catch {
		throw new Error('LEGACY_SITEMAP_LOCATION_URL_INVALID');
	}

	if (
		url.origin !== LEGACY_SITE_ORIGIN ||
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		!url.pathname.startsWith('/')
	) {
		throw new Error('LEGACY_SITEMAP_LOCATION_BOUNDARY_INVALID');
	}
	if (kind === 'images' && !url.pathname.startsWith(LEGACY_SITEMAP_SOURCES.images.pathPrefix)) {
		throw new Error('LEGACY_IMAGE_PATH_BOUNDARY_INVALID');
	}
	if (kind === 'pages' && url.pathname.startsWith(LEGACY_SITEMAP_SOURCES.images.pathPrefix)) {
		throw new Error('LEGACY_PAGE_PATH_BOUNDARY_INVALID');
	}
	return url.pathname;
}

export function buildSourceRecord({ kind, endpoint, contentType, body }) {
	const expected = LEGACY_SITEMAP_SOURCES[kind];
	if (!expected || endpoint !== expected.endpoint) throw new Error('LEGACY_SITEMAP_ENDPOINT_INVALID');
	if (typeof contentType !== 'string' || !contentType.toLowerCase().includes('xml')) {
		throw new Error('LEGACY_SITEMAP_CONTENT_TYPE_INVALID');
	}
	if (typeof body !== 'string' || body.length === 0) throw new Error('LEGACY_SITEMAP_BODY_INVALID');

	const locations = extractSitemapLocations(body, { kind });
	const emptyLocationCount = locations.filter((location) => !location).length;
	const usableLocations = locations.filter(Boolean);
	if (usableLocations.length === 0) throw new Error('LEGACY_SITEMAP_USABLE_LOCATIONS_MISSING');
	const paths = [...new Set(usableLocations.map((location) => normalizeLegacyLocation(location, { kind })))].sort();
	const pathPayload = `${paths.join('\n')}\n`;

	return {
		kind,
		endpoint,
		content_type: contentType,
		response_sha256: sha256(body),
		observed_location_count: locations.length,
		empty_location_count: emptyLocationCount,
		unique_url_count: paths.length,
		path_set_sha256: sha256(pathPayload),
		paths,
	};
}

export function buildLegacySourceInventory({ capturedAt, pageSource, imageSource }) {
	const completed = ['wordpress_public_sitemaps'];
	const unresolved = REQUIRED_LEGACY_EVIDENCE_SOURCES.filter((source) => !completed.includes(source));
	const sourceSetSha = sha256(`${pageSource.path_set_sha256}\n${imageSource.path_set_sha256}\n`);

	return {
		schema_version: 1,
		site_origin: LEGACY_SITE_ORIGIN,
		captured_at: capturedAt,
		source_set_sha256: sourceSetSha,
		sources: {
			pages: pageSource,
			images: imageSource,
		},
		review: {
			status: unresolved.length === 0 ? 'source_evidence_complete' : 'review_required',
			required_evidence_sources: [...REQUIRED_LEGACY_EVIDENCE_SOURCES],
			completed_evidence_sources: completed,
			unresolved_evidence_sources: unresolved,
		},
	};
}

function exactKeys(value, expectedKeys, code) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
	const actual = Object.keys(value).sort();
	const expected = [...expectedKeys].sort();
	if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
		throw new Error(code);
	}
}

function validateSourceRecord(source, kind) {
	exactKeys(
		source,
		[
			'kind',
			'endpoint',
			'content_type',
			'response_sha256',
			'observed_location_count',
			'empty_location_count',
			'unique_url_count',
			'path_set_sha256',
			'paths',
		],
		'LEGACY_SOURCE_RECORD_SHAPE_INVALID'
	);
	if (source.kind !== kind || source.endpoint !== LEGACY_SITEMAP_SOURCES[kind].endpoint) {
		throw new Error('LEGACY_SOURCE_RECORD_IDENTITY_INVALID');
	}
	if (typeof source.content_type !== 'string' || !source.content_type.toLowerCase().includes('xml')) {
		throw new Error('LEGACY_SOURCE_RECORD_CONTENT_TYPE_INVALID');
	}
	if (!SHA256_PATTERN.test(source.response_sha256) || !SHA256_PATTERN.test(source.path_set_sha256)) {
		throw new Error('LEGACY_SOURCE_RECORD_DIGEST_INVALID');
	}
	if (!Number.isSafeInteger(source.observed_location_count) || source.observed_location_count < 1) {
		throw new Error('LEGACY_SOURCE_RECORD_COUNT_INVALID');
	}
	if (!Number.isSafeInteger(source.unique_url_count) || source.unique_url_count < 1) {
		throw new Error('LEGACY_SOURCE_RECORD_COUNT_INVALID');
	}
	if (
		!Number.isSafeInteger(source.empty_location_count) ||
		source.empty_location_count < 0 ||
		source.empty_location_count >= source.observed_location_count
	) {
		throw new Error('LEGACY_SOURCE_RECORD_COUNT_INVALID');
	}
	if (!Array.isArray(source.paths) || source.paths.length !== source.unique_url_count) {
		throw new Error('LEGACY_SOURCE_RECORD_PATHS_INVALID');
	}
	if (source.observed_location_count - source.empty_location_count < source.unique_url_count) {
		throw new Error('LEGACY_SOURCE_RECORD_COUNT_INVALID');
	}

	const normalized = source.paths.map((path) => normalizeLegacyLocation(`${LEGACY_SITE_ORIGIN}${path}`, { kind }));
	const sortedUnique = [...new Set(normalized)].sort();
	if (sortedUnique.length !== source.paths.length || sortedUnique.some((path, index) => path !== source.paths[index])) {
		throw new Error('LEGACY_SOURCE_RECORD_PATH_ORDER_INVALID');
	}
	if (sha256(`${source.paths.join('\n')}\n`) !== source.path_set_sha256) {
		throw new Error('LEGACY_SOURCE_RECORD_PATH_DIGEST_INVALID');
	}
}

export function validateLegacySourceInventory(inventory) {
	exactKeys(
		inventory,
		['schema_version', 'site_origin', 'captured_at', 'source_set_sha256', 'sources', 'review'],
		'LEGACY_SOURCE_INVENTORY_SHAPE_INVALID'
	);
	if (inventory.schema_version !== 1 || inventory.site_origin !== LEGACY_SITE_ORIGIN) {
		throw new Error('LEGACY_SOURCE_INVENTORY_IDENTITY_INVALID');
	}
	if (typeof inventory.captured_at !== 'string' || !Number.isFinite(Date.parse(inventory.captured_at))) {
		throw new Error('LEGACY_SOURCE_INVENTORY_CAPTURE_TIME_INVALID');
	}
	if (!SHA256_PATTERN.test(inventory.source_set_sha256)) {
		throw new Error('LEGACY_SOURCE_INVENTORY_DIGEST_INVALID');
	}
	exactKeys(inventory.sources, ['pages', 'images'], 'LEGACY_SOURCE_INVENTORY_SOURCES_INVALID');
	validateSourceRecord(inventory.sources.pages, 'pages');
	validateSourceRecord(inventory.sources.images, 'images');

	const expectedSourceSetSha = sha256(
		`${inventory.sources.pages.path_set_sha256}\n${inventory.sources.images.path_set_sha256}\n`
	);
	if (expectedSourceSetSha !== inventory.source_set_sha256) {
		throw new Error('LEGACY_SOURCE_INVENTORY_SET_DIGEST_INVALID');
	}

	exactKeys(
		inventory.review,
		['status', 'required_evidence_sources', 'completed_evidence_sources', 'unresolved_evidence_sources'],
		'LEGACY_SOURCE_INVENTORY_REVIEW_INVALID'
	);
	const required = inventory.review.required_evidence_sources;
	const completed = inventory.review.completed_evidence_sources;
	const unresolved = inventory.review.unresolved_evidence_sources;
	if (
		!Array.isArray(required) ||
		!Array.isArray(completed) ||
		!Array.isArray(unresolved) ||
		JSON.stringify(required) !== JSON.stringify(REQUIRED_LEGACY_EVIDENCE_SOURCES)
	) {
		throw new Error('LEGACY_SOURCE_INVENTORY_REVIEW_INVALID');
	}
	const expectedUnresolved = required.filter((source) => !completed.includes(source));
	if (
		new Set(completed).size !== completed.length ||
		completed.some((source) => !required.includes(source)) ||
		JSON.stringify(unresolved) !== JSON.stringify(expectedUnresolved)
	) {
		throw new Error('LEGACY_SOURCE_INVENTORY_REVIEW_INVALID');
	}
	const expectedStatus = unresolved.length === 0 ? 'source_evidence_complete' : 'review_required';
	if (inventory.review.status !== expectedStatus) throw new Error('LEGACY_SOURCE_INVENTORY_REVIEW_STATUS_INVALID');
	return inventory;
}

function normalizeContractPath(path, code) {
	if (typeof path !== 'string' || path.length === 0) throw new Error(code);
	let parsed;
	try {
		parsed = new URL(path, LEGACY_SITE_ORIGIN);
	} catch {
		throw new Error(code);
	}
	if (parsed.origin !== LEGACY_SITE_ORIGIN || parsed.search || parsed.hash || parsed.pathname !== path) {
		throw new Error(code);
	}
	return parsed.pathname;
}

export function validateLegacyUrlContract(contract, inventory) {
	validateLegacySourceInventory(inventory);
	exactKeys(
		contract,
		['schema_version', 'source_set_sha256', 'status', 'page_classifications', 'asset_preservation'],
		'LEGACY_URL_CONTRACT_SHAPE_INVALID'
	);
	if (contract.schema_version !== 1 || contract.source_set_sha256 !== inventory.source_set_sha256) {
		throw new Error('LEGACY_URL_CONTRACT_SOURCE_INVALID');
	}
	if (!['review_required', 'approved'].includes(contract.status) || !Array.isArray(contract.page_classifications)) {
		throw new Error('LEGACY_URL_CONTRACT_STATUS_INVALID');
	}

	const sourcePaths = new Set(inventory.sources.pages.paths);
	const classified = new Set();
	const redirects = new Map();
	for (const entry of contract.page_classifications) {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
			throw new Error('LEGACY_URL_CONTRACT_ENTRY_INVALID');
		}
		const path = normalizeContractPath(entry.path, 'LEGACY_URL_CONTRACT_PATH_INVALID');
		if (!sourcePaths.has(path) || classified.has(path)) throw new Error('LEGACY_URL_CONTRACT_PATH_INVALID');
		classified.add(path);
		if (!['preserve', 'redirect', 'gone'].includes(entry.disposition)) {
			throw new Error('LEGACY_URL_CONTRACT_DISPOSITION_INVALID');
		}
		if (entry.disposition === 'redirect') {
			exactKeys(entry, ['path', 'disposition', 'destination'], 'LEGACY_URL_CONTRACT_ENTRY_INVALID');
			const destination = normalizeContractPath(entry.destination, 'LEGACY_URL_CONTRACT_DESTINATION_INVALID');
			if (destination === path) throw new Error('LEGACY_URL_CONTRACT_DESTINATION_INVALID');
			redirects.set(path, destination);
		} else {
			exactKeys(entry, ['path', 'disposition'], 'LEGACY_URL_CONTRACT_ENTRY_INVALID');
		}
	}

	for (const [source] of redirects) {
		const seen = new Set([source]);
		let destination = redirects.get(source);
		while (redirects.has(destination)) {
			if (seen.has(destination)) throw new Error('LEGACY_URL_CONTRACT_REDIRECT_LOOP');
			seen.add(destination);
			destination = redirects.get(destination);
		}
		if (seen.size > 1) throw new Error('LEGACY_URL_CONTRACT_REDIRECT_CHAIN');
	}

	exactKeys(
		contract.asset_preservation,
		['status', 'path_prefix', 'validated_unique_path_count', 'origin_behavior'],
		'LEGACY_URL_CONTRACT_ASSET_POLICY_INVALID'
	);
	if (
		!['review_required', 'verified'].includes(contract.asset_preservation.status) ||
		contract.asset_preservation.path_prefix !== LEGACY_SITEMAP_SOURCES.images.pathPrefix ||
		!Number.isSafeInteger(contract.asset_preservation.validated_unique_path_count) ||
		contract.asset_preservation.validated_unique_path_count < 0 ||
		!['not_configured', 'cloudfront_legacy_media_origin'].includes(contract.asset_preservation.origin_behavior)
	) {
		throw new Error('LEGACY_URL_CONTRACT_ASSET_POLICY_INVALID');
	}

	return {
		classifiedPageCount: classified.size,
		unclassifiedPageCount: inventory.sources.pages.unique_url_count - classified.size,
		uniqueImagePathCount: inventory.sources.images.unique_url_count,
		complete:
			inventory.review.unresolved_evidence_sources.length === 0 &&
			classified.size === inventory.sources.pages.unique_url_count &&
			contract.asset_preservation.status === 'verified' &&
			contract.asset_preservation.origin_behavior === 'cloudfront_legacy_media_origin' &&
			contract.asset_preservation.validated_unique_path_count === inventory.sources.images.unique_url_count &&
			inventory.sources.pages.empty_location_count === 0 &&
			inventory.sources.images.empty_location_count === 0 &&
			contract.status === 'approved',
	};
}

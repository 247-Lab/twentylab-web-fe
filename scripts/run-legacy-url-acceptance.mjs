import { createHash } from 'node:crypto';
import { lstat, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import {
	LEGACY_SITE_ORIGIN,
	validateLegacySourceInventory,
	validateLegacyUrlContract,
} from './legacy-url-inventory-lib.mjs';

const APPROVAL_PATTERN = /^OPS-[0-9]{1,12}$/;
const EXECUTE_CONFIRMATION = 'VERIFY_LEGACY_URL_CONTRACT';
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_CONCURRENCY = 6;
const QUERY_PROBE = 'legacy_contract=1&ref=acceptance';
const UNKNOWN_PATH = '/__legacy-url-contract-unselected__';
const WWW_SITE_ORIGIN = 'https://www.24-7labs.com';

function fail(code) {
	throw new Error(code);
}

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function pathIsWithin(parent, candidate) {
	const value = relative(resolve(parent), resolve(candidate));
	return value === '' || (value !== '..' && !value.startsWith(`..${sep}`) && !value.startsWith('../'));
}

function normalizePath(value) {
	if (typeof value !== 'string' || !value.startsWith('/')) fail('LEGACY_URL_ACCEPTANCE_PATH_INVALID');
	const url = new URL(value, LEGACY_SITE_ORIGIN);
	if (url.origin !== LEGACY_SITE_ORIGIN || url.search || url.hash || url.pathname !== value) {
		fail('LEGACY_URL_ACCEPTANCE_PATH_INVALID');
	}
	return url.pathname;
}

function exactTargetOrigin(value, accessMode) {
	let url;
	try {
		url = new URL(value);
	} catch {
		fail('LEGACY_URL_ACCEPTANCE_TARGET_INVALID');
	}
	if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
		fail('LEGACY_URL_ACCEPTANCE_TARGET_INVALID');
	}
	if (accessMode === 'public' && url.origin !== LEGACY_SITE_ORIGIN) {
		fail('LEGACY_URL_ACCEPTANCE_TARGET_INVALID');
	}
	return url.origin;
}

async function validateReceiptPath(pathInput, forbiddenRoot) {
	if (!isAbsolute(pathInput || '')) fail('LEGACY_URL_ACCEPTANCE_RECEIPT_PATH_INVALID');
	const path = resolve(pathInput);
	const canonicalParent = await realpath(dirname(path));
	if (resolve(canonicalParent, basename(path)) !== path || (forbiddenRoot && pathIsWithin(forbiddenRoot, path))) {
		fail('LEGACY_URL_ACCEPTANCE_RECEIPT_PATH_INVALID');
	}
	try {
		await lstat(path);
		fail('LEGACY_URL_ACCEPTANCE_RECEIPT_ALREADY_EXISTS');
	} catch (error) {
		if (error?.code !== 'ENOENT') throw error;
	}
	return path;
}

export async function validateLegacyUrlAcceptanceEnvironment(environment, { forbiddenRoot } = {}) {
	if (
		environment.LEGACY_URL_ACCEPTANCE_ENABLED !== 'true' ||
		environment.LEGACY_URL_ACCEPTANCE_CONFIRM !== EXECUTE_CONFIRMATION
	) {
		fail('LEGACY_URL_ACCEPTANCE_DISABLED');
	}
	if (!APPROVAL_PATTERN.test(environment.LEGACY_URL_ACCEPTANCE_APPROVAL_ID || '')) {
		fail('LEGACY_URL_ACCEPTANCE_APPROVAL_INVALID');
	}
	const accessMode = environment.LEGACY_URL_ACCEPTANCE_ACCESS_MODE;
	if (!['private_preview', 'public'].includes(accessMode)) {
		fail('LEGACY_URL_ACCEPTANCE_ACCESS_MODE_INVALID');
	}
	const indexingMode = environment.LEGACY_URL_ACCEPTANCE_INDEXING_MODE;
	if (
		(accessMode === 'private_preview' && indexingMode !== 'noindex') ||
		(accessMode === 'public' && indexingMode !== 'indexable')
	) {
		fail('LEGACY_URL_ACCEPTANCE_INDEXING_MODE_INVALID');
	}
	const previewToken = environment.LEGACY_URL_ACCEPTANCE_PREVIEW_TOKEN || '';
	if (
		(accessMode === 'private_preview' &&
			(previewToken.length < 32 || previewToken.length > 256 || /[\s\u0000-\u001f\u007f]/.test(previewToken))) ||
		(accessMode === 'public' && previewToken !== '')
	) {
		fail('LEGACY_URL_ACCEPTANCE_PREVIEW_TOKEN_INVALID');
	}
	return {
		accessMode,
		approvalReference: environment.LEGACY_URL_ACCEPTANCE_APPROVAL_ID,
		indexingMode,
		previewToken,
		targetOrigin: exactTargetOrigin(environment.LEGACY_URL_ACCEPTANCE_TARGET_ORIGIN, accessMode),
		receiptPath: await validateReceiptPath(environment.LEGACY_URL_ACCEPTANCE_RECEIPT_PATH, forbiddenRoot),
	};
}

function attributes(tag) {
	const result = new Map();
	const expression = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
	for (const match of tag.matchAll(expression)) {
		result.set(match[1].toLowerCase(), match[2] ?? match[3] ?? '');
	}
	return result;
}

function canonicalFromHtml(html) {
	const canonicals = [];
	for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
		const values = attributes(match[0]);
		if ((values.get('rel') || '').toLowerCase().split(/\s+/).includes('canonical')) {
			canonicals.push(values.get('href'));
		}
	}
	if (canonicals.length !== 1 || !canonicals[0]) fail('LEGACY_URL_ACCEPTANCE_CANONICAL_MISSING');
	let canonical;
	try {
		canonical = new URL(canonicals[0], LEGACY_SITE_ORIGIN);
	} catch {
		fail('LEGACY_URL_ACCEPTANCE_CANONICAL_INVALID');
	}
	if (
		canonical.origin !== LEGACY_SITE_ORIGIN ||
		canonical.username ||
		canonical.password ||
		canonical.search ||
		canonical.hash
	) {
		fail('LEGACY_URL_ACCEPTANCE_CANONICAL_INVALID');
	}
	return normalizePath(canonical.pathname);
}

function robotsMetaFromHtml(html) {
	const values = [];
	for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
		const fields = attributes(match[0]);
		if ((fields.get('name') || '').toLowerCase() === 'robots') {
			values.push((fields.get('content') || '').toLowerCase());
		}
	}
	return values.join(',');
}

async function htmlFromResponse(response) {
	const contentType = response.headers.get('content-type') || '';
	if (!contentType.toLowerCase().includes('text/html')) fail('LEGACY_URL_ACCEPTANCE_CONTENT_TYPE_INVALID');
	const declaredLength = Number(response.headers.get('content-length'));
	if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
		fail('LEGACY_URL_ACCEPTANCE_BODY_TOO_LARGE');
	}
	if (!response.body) fail('LEGACY_URL_ACCEPTANCE_BODY_MISSING');
	const reader = response.body.getReader();
	const decoder = new TextDecoder('utf-8', { fatal: true });
	let total = 0;
	let html = '';
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > MAX_HTML_BYTES) {
			await reader.cancel();
			fail('LEGACY_URL_ACCEPTANCE_BODY_TOO_LARGE');
		}
		html += decoder.decode(value, { stream: true });
	}
	return html + decoder.decode();
}

function assertIndexing(response, html, indexingMode) {
	const header = (response.headers.get('x-robots-tag') || '').toLowerCase();
	const meta = robotsMetaFromHtml(html);
	if (indexingMode === 'noindex') {
		if (!header.includes('noindex') || !header.includes('nofollow') || !header.includes('noarchive')) {
			fail('LEGACY_URL_ACCEPTANCE_NOINDEX_MISSING');
		}
	} else if (header.includes('noindex') || meta.includes('noindex')) {
		fail('LEGACY_URL_ACCEPTANCE_UNEXPECTED_NOINDEX');
	}
}

function requestUrl(targetOrigin, path, search = '') {
	const target = new URL(targetOrigin);
	target.pathname = path;
	target.search = search;
	return target.toString();
}

async function request(fetchImplementation, settings, path, search = '') {
	const headers = {
		accept: 'text/html',
		'user-agent': '24-7Labs-Legacy-URL-Acceptance/1',
	};
	if (settings.accessMode === 'private_preview') {
		headers['x-24-7labs-preview-authorization'] = settings.previewToken;
	}
	return fetchImplementation(requestUrl(settings.targetOrigin, path, search), {
		method: 'GET',
		redirect: 'manual',
		headers,
		signal: AbortSignal.timeout(10_000),
	});
}

async function assertDestinationPage(fetchImplementation, settings, path, search = '') {
	const response = await request(fetchImplementation, settings, path, search);
	if (response.status !== 200 || response.headers.has('location')) {
		fail('LEGACY_URL_ACCEPTANCE_DESTINATION_STATUS_INVALID');
	}
	const html = await htmlFromResponse(response);
	if (canonicalFromHtml(html) !== normalizePath(path)) {
		fail('LEGACY_URL_ACCEPTANCE_CANONICAL_MISMATCH');
	}
	assertIndexing(response, html, settings.indexingMode);
	return 1;
}

async function testClassification(fetchImplementation, settings, entry) {
	if (entry.disposition === 'preserve') {
		return assertDestinationPage(fetchImplementation, settings, entry.path);
	}
	if (entry.disposition === 'gone') {
		const response = await request(fetchImplementation, settings, entry.path);
		if (response.status !== 410 || response.headers.has('location')) {
			fail('LEGACY_URL_ACCEPTANCE_GONE_STATUS_INVALID');
		}
		const header = (response.headers.get('x-robots-tag') || '').toLowerCase();
		if (!header.includes('noindex')) fail('LEGACY_URL_ACCEPTANCE_GONE_INDEXABLE');
		return 1;
	}

	const response = await request(fetchImplementation, settings, entry.path, QUERY_PROBE);
	if (![301, 308].includes(response.status)) fail('LEGACY_URL_ACCEPTANCE_REDIRECT_STATUS_INVALID');
	const location = response.headers.get('location');
	let destination;
	try {
		destination = new URL(location, LEGACY_SITE_ORIGIN);
	} catch {
		fail('LEGACY_URL_ACCEPTANCE_REDIRECT_LOCATION_INVALID');
	}
	if (
		destination.origin !== LEGACY_SITE_ORIGIN ||
		normalizePath(destination.pathname) !== normalizePath(entry.destination) ||
		destination.search !== `?${QUERY_PROBE}` ||
		destination.hash
	) {
		fail('LEGACY_URL_ACCEPTANCE_REDIRECT_LOCATION_INVALID');
	}
	return (
		1 +
		(await assertDestinationPage(
			fetchImplementation,
			settings,
			destination.pathname,
			destination.searchParams.toString()
		))
	);
}

async function assertPublicDomainCanonicalization(fetchImplementation, settings) {
	if (settings.accessMode !== 'public') return 0;
	const wwwUrl = new URL(WWW_SITE_ORIGIN);
	wwwUrl.search = QUERY_PROBE;
	const response = await fetchImplementation(wwwUrl.toString(), {
		method: 'GET',
		redirect: 'manual',
		headers: {
			accept: 'text/html',
			'user-agent': '24-7Labs-Legacy-URL-Acceptance/1',
		},
		signal: AbortSignal.timeout(10_000),
	});
	if (![301, 308].includes(response.status)) {
		fail('LEGACY_URL_ACCEPTANCE_DOMAIN_REDIRECT_STATUS_INVALID');
	}
	let destination;
	try {
		destination = new URL(response.headers.get('location'), WWW_SITE_ORIGIN);
	} catch {
		fail('LEGACY_URL_ACCEPTANCE_DOMAIN_REDIRECT_LOCATION_INVALID');
	}
	if (
		destination.origin !== LEGACY_SITE_ORIGIN ||
		destination.pathname !== '/' ||
		destination.search !== `?${QUERY_PROBE}` ||
		destination.hash
	) {
		fail('LEGACY_URL_ACCEPTANCE_DOMAIN_REDIRECT_LOCATION_INVALID');
	}
	return 1 + (await assertDestinationPage(fetchImplementation, settings, destination.pathname, destination.search));
}

async function mapWithConcurrency(values, worker, concurrency = MAX_CONCURRENCY) {
	const results = new Array(values.length);
	let index = 0;
	async function consume() {
		while (index < values.length) {
			const current = index;
			index += 1;
			results[current] = await worker(values[current]);
		}
	}
	await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, consume));
	return results;
}

export async function executeLegacyUrlAcceptance({
	contract,
	inventory,
	contractSerialized,
	inventorySerialized,
	environment,
	fetchImplementation = fetch,
	now = () => new Date(),
	forbiddenRoot,
}) {
	let serializedInventoryValue;
	try {
		serializedInventoryValue = JSON.parse(inventorySerialized);
	} catch {
		fail('LEGACY_URL_ACCEPTANCE_INVENTORY_SERIALIZATION_INVALID');
	}
	if (!isDeepStrictEqual(serializedInventoryValue, inventory)) {
		fail('LEGACY_URL_ACCEPTANCE_INVENTORY_SERIALIZATION_INVALID');
	}
	let serializedContractValue;
	try {
		serializedContractValue = JSON.parse(contractSerialized);
	} catch {
		fail('LEGACY_URL_ACCEPTANCE_CONTRACT_SERIALIZATION_INVALID');
	}
	if (!isDeepStrictEqual(serializedContractValue, contract)) {
		fail('LEGACY_URL_ACCEPTANCE_CONTRACT_SERIALIZATION_INVALID');
	}
	validateLegacySourceInventory(inventory);
	const validation = validateLegacyUrlContract(contract, inventory);
	if (!validation.complete) fail('LEGACY_URL_ACCEPTANCE_CONTRACT_INCOMPLETE');
	const settings = await validateLegacyUrlAcceptanceEnvironment(environment, { forbiddenRoot });
	const requests = await mapWithConcurrency(contract.page_classifications, (entry) =>
		testClassification(fetchImplementation, settings, entry)
	);
	const unknown = await request(fetchImplementation, settings, UNKNOWN_PATH);
	if (unknown.status !== 404 || unknown.headers.has('location')) {
		fail('LEGACY_URL_ACCEPTANCE_UNKNOWN_PATH_INVALID');
	}
	const domainCanonicalizationRequests = await assertPublicDomainCanonicalization(fetchImplementation, settings);
	const counts = contract.page_classifications.reduce(
		(result, entry) => ({ ...result, [entry.disposition]: result[entry.disposition] + 1 }),
		{ preserve: 0, redirect: 0, gone: 0 }
	);
	const receipt = {
		schema_version: 1,
		tested_at: now().toISOString(),
		approval_reference: settings.approvalReference,
		source_set_sha256: inventory.source_set_sha256,
		inventory_sha256: sha256(inventorySerialized),
		contract_sha256: sha256(contractSerialized),
		target_origin: settings.targetOrigin,
		access_mode: settings.accessMode,
		indexing_mode: settings.indexingMode,
		classified_page_count: validation.classifiedPageCount,
		preserved_page_count: counts.preserve,
		redirected_page_count: counts.redirect,
		gone_page_count: counts.gone,
		request_count: requests.reduce((total, value) => total + value, 0) + 1 + domainCanonicalizationRequests,
		canonical_contract_verified: true,
		one_hop_redirects_verified: true,
		query_preservation_verified: true,
		unknown_path_404_verified: true,
		indexing_contract_verified: true,
		domain_canonicalization_verified: settings.accessMode === 'public',
		site_mutated: false,
	};
	const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
	await writeFile(settings.receiptPath, serialized, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
	return { ...receipt, receipt_sha256: sha256(serialized) };
}

async function runFromRepository(environment = process.env) {
	const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const inventorySerialized = await readFile(resolve(root, 'config', 'legacy-url-source-inventory.json'), 'utf8');
	const contractSerialized = await readFile(resolve(root, 'config', 'legacy-url-contract.json'), 'utf8');
	return executeLegacyUrlAcceptance({
		inventory: JSON.parse(inventorySerialized),
		contract: JSON.parse(contractSerialized),
		contractSerialized,
		inventorySerialized,
		environment,
		forbiddenRoot: root,
	});
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	if (process.argv.length !== 3 || process.argv[2] !== '--execute') {
		console.error('Usage: node scripts/run-legacy-url-acceptance.mjs --execute');
		process.exit(2);
	}
	try {
		const result = await runFromRepository();
		console.log(JSON.stringify(result));
	} catch {
		console.error('Legacy URL acceptance failed.');
		process.exitCode = 1;
	}
}

export { EXECUTE_CONFIRMATION, QUERY_PROBE, UNKNOWN_PATH };

import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	buildLegacyProductRouteEvidence,
	extractLegacyProductFacts,
	validateLegacyProductRouteEvidence,
} from './legacy-product-route-evidence-lib.mjs';

const MAX_CATALOG_BYTES = 4 * 1024 * 1024;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_CONCURRENCY = 4;
const args = process.argv.slice(2);

if (
	args.length !== 2 ||
	!args.includes('--catalog-stdin') ||
	!args.includes('--write') ||
	new Set(args).size !== args.length
) {
	throw new Error('Usage: node scripts/capture-legacy-product-route-evidence.mjs --catalog-stdin --write');
}

async function readStandardInput() {
	const chunks = [];
	let bytes = 0;
	for await (const chunk of process.stdin) {
		bytes += chunk.length;
		if (bytes > MAX_CATALOG_BYTES) throw new Error('LEGACY_PRODUCT_CATALOG_TOO_LARGE');
		chunks.push(chunk);
	}
	if (bytes === 0) throw new Error('LEGACY_PRODUCT_CATALOG_MISSING');
	try {
		return JSON.parse(Buffer.concat(chunks).toString('utf8'));
	} catch {
		throw new Error('LEGACY_PRODUCT_CATALOG_JSON_INVALID');
	}
}

async function readHtml(response) {
	const declaredLength = Number(response.headers.get('content-length'));
	if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
		throw new Error('LEGACY_PRODUCT_RESPONSE_BODY_INVALID');
	}
	if (!response.body) throw new Error('LEGACY_PRODUCT_RESPONSE_BODY_INVALID');
	const reader = response.body.getReader();
	const chunks = [];
	let bytes = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		bytes += value.byteLength;
		if (bytes > MAX_HTML_BYTES) {
			await reader.cancel();
			throw new Error('LEGACY_PRODUCT_RESPONSE_BODY_INVALID');
		}
		chunks.push(value);
	}
	return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}

async function fetchProduct(path, origin) {
	const endpoint = new URL(path, origin).toString();
	const response = await fetch(endpoint, {
		redirect: 'error',
		signal: AbortSignal.timeout(30_000),
		headers: {
			accept: 'text/html,application/xhtml+xml;q=0.9',
			'user-agent': '24-7Labs-Legacy-Product-Route-Capture/1',
		},
	});
	if (response.url !== endpoint) throw new Error('LEGACY_PRODUCT_RESPONSE_URL_INVALID');
	return extractLegacyProductFacts({
		path,
		status: response.status,
		contentType: response.headers.get('content-type') || '',
		body: await readHtml(response),
	});
}

async function mapWithConcurrency(values, worker) {
	const results = new Array(values.length);
	let index = 0;
	async function consume() {
		while (index < values.length) {
			const current = index;
			index += 1;
			results[current] = await worker(values[current]);
		}
	}
	await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, values.length) }, consume));
	return results;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = resolve(root, 'config', 'legacy-url-source-inventory.json');
const evidencePath = resolve(root, 'config', 'legacy-product-route-evidence.json');
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
const catalog = await readStandardInput();
const productPaths = inventory.sources.pages.paths.filter((path) => path.startsWith('/product/'));
const facts = await mapWithConcurrency(productPaths, (path) => fetchProduct(path, inventory.site_origin));
const evidence = validateLegacyProductRouteEvidence(
	buildLegacyProductRouteEvidence({
		capturedAt: new Date().toISOString(),
		inventory,
		catalog,
		facts,
	}),
	inventory
);

const temporary = `${evidencePath}.tmp`;
await writeFile(temporary, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
await rename(temporary, evidencePath);

process.stdout.write(
	`${JSON.stringify({
		captured: true,
		written: true,
		matched_product_count: evidence.matched_product_count,
		unresolved_product_count: evidence.unresolved_product_count,
		mapping_set_sha256: evidence.mapping_set_sha256,
	})}\n`
);

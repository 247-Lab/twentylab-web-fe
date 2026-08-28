import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LEGACY_PAGE_ALIASES } from '../config/legacyPageAliases.mjs';
import {
	buildLegacyPageAliasEvidence,
	extractLegacyPageAliasFacts,
	validateLegacyPageAliasEvidence,
} from './legacy-page-alias-evidence-lib.mjs';

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_CONCURRENCY = 4;
const args = process.argv.slice(2);

if (args.length !== 1 || args[0] !== '--write') {
	throw new Error('Usage: node scripts/capture-legacy-page-alias-evidence.mjs --write');
}

async function readHtml(response) {
	const declaredLength = Number(response.headers.get('content-length'));
	if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
		throw new Error('LEGACY_PAGE_ALIAS_RESPONSE_BODY_INVALID');
	}
	if (!response.body) throw new Error('LEGACY_PAGE_ALIAS_RESPONSE_BODY_INVALID');
	const reader = response.body.getReader();
	const chunks = [];
	let bytes = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		bytes += value.byteLength;
		if (bytes > MAX_HTML_BYTES) {
			await reader.cancel();
			throw new Error('LEGACY_PAGE_ALIAS_RESPONSE_BODY_INVALID');
		}
		chunks.push(value);
	}
	return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}

async function fetchAlias(alias, origin) {
	const endpoint = new URL(alias.source, origin).toString();
	const response = await fetch(endpoint, {
		redirect: 'error',
		signal: AbortSignal.timeout(30_000),
		headers: {
			accept: 'text/html,application/xhtml+xml;q=0.9',
			'user-agent': '24-7Labs-Legacy-Page-Alias-Capture/1',
		},
	});
	if (response.url !== endpoint) throw new Error('LEGACY_PAGE_ALIAS_RESPONSE_URL_INVALID');
	return extractLegacyPageAliasFacts({
		path: alias.source,
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
const evidencePath = resolve(root, 'config', 'legacy-page-alias-evidence.json');
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
const facts = await mapWithConcurrency(LEGACY_PAGE_ALIASES, (alias) => fetchAlias(alias, inventory.site_origin));
const evidence = validateLegacyPageAliasEvidence(
	buildLegacyPageAliasEvidence({
		capturedAt: new Date().toISOString(),
		inventory,
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
		mapping_count: evidence.mapping_count,
		mapping_set_sha256: evidence.mapping_set_sha256,
	})}\n`
);

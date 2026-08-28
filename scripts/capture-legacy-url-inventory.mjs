import { rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	buildLegacySourceInventory,
	buildSourceRecord,
	LEGACY_SITEMAP_SOURCES,
	validateLegacySourceInventory,
} from './legacy-url-inventory-lib.mjs';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--write') || args.filter((arg) => arg === '--write').length > 1) {
	throw new Error('Usage: node scripts/capture-legacy-url-inventory.mjs [--write]');
}

async function fetchSource(kind) {
	const endpoint = LEGACY_SITEMAP_SOURCES[kind].endpoint;
	const response = await fetch(endpoint, {
		redirect: 'error',
		signal: AbortSignal.timeout(30_000),
		headers: { accept: 'application/xml,text/xml;q=0.9' },
	});
	if (!response.ok || response.url !== endpoint) throw new Error('LEGACY_SITEMAP_FETCH_FAILED');
	const contentType = response.headers.get('content-type') || '';
	const body = await response.text();
	return buildSourceRecord({ kind, endpoint, contentType, body });
}

const [pageSource, imageSource] = await Promise.all([fetchSource('pages'), fetchSource('images')]);
const inventory = validateLegacySourceInventory(
	buildLegacySourceInventory({
		capturedAt: new Date().toISOString(),
		pageSource,
		imageSource,
	})
);

if (args.includes('--write')) {
	const scriptDirectory = dirname(fileURLToPath(import.meta.url));
	const destination = resolve(scriptDirectory, '..', 'config', 'legacy-url-source-inventory.json');
	const temporary = `${destination}.tmp`;
	await writeFile(temporary, `${JSON.stringify(inventory, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
	await rename(temporary, destination);
}

process.stdout.write(
	`${JSON.stringify({
		captured: true,
		written: args.includes('--write'),
		captured_at: inventory.captured_at,
		page_locations: inventory.sources.pages.observed_location_count,
		empty_page_locations: inventory.sources.pages.empty_location_count,
		unique_page_urls: inventory.sources.pages.unique_url_count,
		image_locations: inventory.sources.images.observed_location_count,
		empty_image_locations: inventory.sources.images.empty_location_count,
		unique_image_urls: inventory.sources.images.unique_url_count,
		source_set_sha256: inventory.source_set_sha256,
	})}\n`
);

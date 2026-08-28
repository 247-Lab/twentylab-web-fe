import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLegacySourceInventory, validateLegacyUrlContract } from './legacy-url-inventory-lib.mjs';

const args = process.argv.slice(2);
if (args.length !== 1 || !['--source-only', '--require-complete'].includes(args[0])) {
	throw new Error('Usage: node scripts/validate-legacy-url-contract.mjs --source-only|--require-complete');
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventory = JSON.parse(await readFile(resolve(root, 'config', 'legacy-url-source-inventory.json'), 'utf8'));
const contract = JSON.parse(await readFile(resolve(root, 'config', 'legacy-url-contract.json'), 'utf8'));

validateLegacySourceInventory(inventory);
const result = validateLegacyUrlContract(contract, inventory);
if (args[0] === '--require-complete' && !result.complete) {
	process.stderr.write(
		`${JSON.stringify({
			valid: false,
			release_ready: false,
			unresolved_evidence_source_count: inventory.review.unresolved_evidence_sources.length,
			unclassified_page_count: result.unclassifiedPageCount,
			legacy_media_verified: contract.asset_preservation.status === 'verified',
		})}\n`
	);
	process.exitCode = 1;
} else {
	process.stdout.write(
		`${JSON.stringify({
			valid: true,
			release_ready: result.complete,
			page_count: inventory.sources.pages.unique_url_count,
			classified_page_count: result.classifiedPageCount,
			unique_image_path_count: result.uniqueImagePathCount,
		})}\n`
	);
}

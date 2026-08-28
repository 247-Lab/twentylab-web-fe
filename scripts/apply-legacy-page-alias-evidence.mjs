import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	validateLegacyPageAliasEvidence,
	validatePageAliasEvidenceContract,
} from './legacy-page-alias-evidence-lib.mjs';
import { validateLegacyUrlContract } from './legacy-url-inventory-lib.mjs';

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== '--write') {
	throw new Error('Usage: node scripts/apply-legacy-page-alias-evidence.mjs --write');
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = resolve(root, 'config', 'legacy-url-source-inventory.json');
const evidencePath = resolve(root, 'config', 'legacy-page-alias-evidence.json');
const contractPath = resolve(root, 'config', 'legacy-url-contract.json');
const [inventory, evidence, contract] = await Promise.all(
	[inventoryPath, evidencePath, contractPath].map(async (path) => JSON.parse(await readFile(path, 'utf8')))
);

validateLegacyPageAliasEvidence(evidence, inventory);
const aliasPaths = new Set(evidence.mappings.map(({ path }) => path));
const classifications = contract.page_classifications
	.filter(({ path }) => !aliasPaths.has(path))
	.concat(
		evidence.mappings.map(({ path, destination }) => ({
			path,
			disposition: 'redirect',
			destination,
		}))
	)
	.sort((left, right) => left.path.localeCompare(right.path));
const updatedContract = { ...contract, page_classifications: classifications };
validateLegacyUrlContract(updatedContract, inventory);
validatePageAliasEvidenceContract(evidence, updatedContract);

const temporary = `${contractPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(updatedContract, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
await rename(temporary, contractPath);

process.stdout.write(
	`${JSON.stringify({
		applied: true,
		mapping_count: evidence.mapping_count,
		classified_page_count: updatedContract.page_classifications.length,
	})}\n`
);

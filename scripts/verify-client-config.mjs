import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const STATIC_DIRECTORY = join('.next', 'static');
async function javascriptFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) return javascriptFiles(path);
			return entry.isFile() && entry.name.endsWith('.js') ? [path] : [];
		})
	);
	return files.flat();
}

function selectedPublicApiUrl(environment = process.env) {
	if (!['dev', 'prod'].includes(environment.NEXT_PUBLIC_MODE)) {
		throw new Error('NEXT_PUBLIC_MODE must be dev or prod');
	}

	const value =
		environment.NEXT_PUBLIC_MODE === 'dev' ? environment.NEXT_PUBLIC_DEV_API_URL : environment.NEXT_PUBLIC_PROD_API_URL;
	if (!value) throw new Error('The selected public API URL is required');
	return value.replace(/\/$/, '');
}

const expectedApiUrl = selectedPublicApiUrl();
const expectedUnoptimizedImages = process.env.NEXT_PUBLIC_MODE === 'dev';
const selectedVariable =
	process.env.NEXT_PUBLIC_MODE === 'dev' ? 'NEXT_PUBLIC_DEV_API_URL' : 'NEXT_PUBLIC_PROD_API_URL';
const forbiddenEnvironmentLookups = ['NEXT_PUBLIC_MODE', selectedVariable];
const files = await javascriptFiles(STATIC_DIRECTORY);
let compiledOriginFound = false;
const unresolvedLookups = [];

for (const file of files) {
	const source = await readFile(file, 'utf8');
	if (source.includes(expectedApiUrl)) compiledOriginFound = true;

	for (const name of forbiddenEnvironmentLookups) {
		if (source.includes(name)) unresolvedLookups.push(`${file}: ${name}`);
	}
}

if (!compiledOriginFound) {
	throw new Error(`The selected public API URL was not found in .next/static: ${expectedApiUrl}`);
}

if (unresolvedLookups.length) {
	throw new Error(`Unresolved public environment lookups remain in client chunks:\n${unresolvedLookups.join('\n')}`);
}

const imageManifest = JSON.parse(await readFile(join('.next', 'images-manifest.json'), 'utf8'));
if (imageManifest?.images?.unoptimized !== expectedUnoptimizedImages) {
	throw new Error(
		`Unexpected image optimization mode: expected unoptimized=${expectedUnoptimizedImages}, received ${imageManifest?.images?.unoptimized}`
	);
}

console.log(`Verified compiled browser API origin: ${expectedApiUrl}`);
console.log(`Verified image optimization mode: unoptimized=${expectedUnoptimizedImages}`);

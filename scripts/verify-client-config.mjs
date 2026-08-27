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
const checkoutEnabled = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === 'true';
const expectedCheckoutValues = checkoutEnabled
	? [
			process.env.NEXT_PUBLIC_AUTHORIZE_NET_ENVIRONMENT === 'sandbox'
				? 'https://jstest.authorize.net/v3/AcceptUI.js'
				: 'https://js.authorize.net/v3/AcceptUI.js',
			process.env.NEXT_PUBLIC_AUTHORIZE_NET_API_LOGIN_ID,
			process.env.NEXT_PUBLIC_AUTHORIZE_NET_CLIENT_KEY,
		]
	: [];
const forbiddenEnvironmentLookups = [
	'NEXT_PUBLIC_MODE',
	selectedVariable,
	'NEXT_PUBLIC_CHECKOUT_ENABLED',
	...(checkoutEnabled
		? [
				'NEXT_PUBLIC_AUTHORIZE_NET_ENVIRONMENT',
				'NEXT_PUBLIC_AUTHORIZE_NET_API_LOGIN_ID',
				'NEXT_PUBLIC_AUTHORIZE_NET_CLIENT_KEY',
			]
		: []),
];
const files = await javascriptFiles(STATIC_DIRECTORY);
let compiledOriginFound = false;
const compiledCheckoutValues = new Set();
const unresolvedLookups = [];

for (const file of files) {
	const source = await readFile(file, 'utf8');
	if (source.includes(expectedApiUrl)) compiledOriginFound = true;
	for (const value of expectedCheckoutValues) {
		if (value && source.includes(value)) compiledCheckoutValues.add(value);
	}

	for (const name of forbiddenEnvironmentLookups) {
		if (source.includes(name)) unresolvedLookups.push(`${file}: ${name}`);
	}
}

if (!compiledOriginFound) {
	throw new Error(`The selected public API URL was not found in .next/static: ${expectedApiUrl}`);
}

if (expectedCheckoutValues.some((value) => !value || !compiledCheckoutValues.has(value))) {
	throw new Error('The enabled checkout browser configuration was not fully compiled into .next/static');
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
console.log(`Verified compiled checkout mode: enabled=${checkoutEnabled}`);

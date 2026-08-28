import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { resolve } from 'node:path';

const HOST = '127.0.0.1';
const PORT = 4017;
const API_PORT = 4018;
const ORIGIN = `http://${HOST}:${PORT}`;
const START_TIMEOUT_MS = 20_000;
const redirectCases = [
	{ source: '/shop/?campaign=1', destination: '/testing-services?campaign=1' },
	{ source: '/shop-2/?campaign=1', destination: '/testing-services?campaign=1' },
	{ source: '/about-us/?campaign=1', destination: '/about?campaign=1' },
	{
		source: '/prescription-medication-consent-form/?campaign=1',
		destination: '/prescription-consent-form?campaign=1',
	},
	{ source: '/product/a-b-hiv?campaign=1', destination: '/product/a-b-hiv/?campaign=1' },
	{ source: '/testing-services/28?campaign=1', destination: '/product/a-b-hiv/?campaign=1' },
	{ source: '/blogs/chlamydia-101/?campaign=1', destination: '/chlamydia-101?campaign=1' },
	{ source: '/contact/?campaign=1', destination: '/contact?campaign=1' },
];
const renderedCases = [
	{
		path: '/product/a-b-hiv/?campaign=1',
		canonical: 'https://24-7labs.com/product/a-b-hiv/',
	},
	{
		path: '/privacy-policy?campaign=1',
		canonical: 'https://24-7labs.com/privacy-policy',
	},
];

if (process.argv.length !== 2) {
	throw new Error('Usage: node scripts/smoke-canonical-redirects.mjs');
}

const nextBinary = resolve('node_modules', 'next', 'dist', 'bin', 'next');
const syntheticProduct = {
	id: 28,
	name: { en: 'Synthetic Route Product', es: 'Producto sintético' },
	description: { en: 'Synthetic product used only by the compiled route smoke.' },
	regular_price: '10.00',
	sale_price: null,
	stock_quantity: 1,
	published: true,
	visible: true,
	variant_of: null,
	main_image: null,
	categories: [],
	variants: [],
};
const api = createServer((request, response) => {
	const url = new URL(request.url, `http://${HOST}:${API_PORT}`);
	response.setHeader('content-type', 'application/json; charset=utf-8');
	if (url.pathname === '/api/products') {
		response.end(JSON.stringify({ products: [syntheticProduct], total: 1, pages: 1, page: 1, limit: 100 }));
		return;
	}
	if (url.pathname === '/api/category') {
		response.end('[]');
		return;
	}
	response.statusCode = 404;
	response.end(JSON.stringify({ error: 'synthetic_not_found' }));
});
await new Promise((resolveListening, rejectListening) => {
	api.once('error', rejectListening);
	api.listen(API_PORT, HOST, resolveListening);
});
const child = spawn(process.execPath, [nextBinary, 'start', '--hostname', HOST, '--port', String(PORT)], {
	cwd: process.cwd(),
	env: {
		...process.env,
		NEXT_TELEMETRY_DISABLED: '1',
		NEXT_PUBLIC_MODE: 'prod',
		NEXT_PUBLIC_PROD_API_URL: 'http://127.0.0.1:9',
		NEXT_PUBLIC_SITE_URL: 'https://24-7labs.com',
		NEXT_PUBLIC_CHECKOUT_ENABLED: 'false',
		INTERNAL_API_URL: `http://${HOST}:${API_PORT}`,
	},
	stdio: ['ignore', 'pipe', 'pipe'],
});

let childOutput = '';
for (const stream of [child.stdout, child.stderr]) {
	stream.setEncoding('utf8');
	stream.on('data', (chunk) => {
		childOutput = `${childOutput}${chunk}`.slice(-4096);
	});
}

async function waitUntilReady() {
	const deadline = Date.now() + START_TIMEOUT_MS;
	while (Date.now() < deadline) {
		if (child.exitCode !== null) throw new Error('CANONICAL_REDIRECT_SMOKE_SERVER_EXITED');
		try {
			const response = await fetch(`${ORIGIN}/api/health`, {
				redirect: 'manual',
				signal: AbortSignal.timeout(1_000),
			});
			if (response.status === 200) return;
		} catch {
			// The compiled server is still starting.
		}
		await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
	}
	throw new Error('CANONICAL_REDIRECT_SMOKE_SERVER_TIMEOUT');
}

async function stopChild() {
	if (child.exitCode !== null) return;
	child.kill('SIGTERM');
	await Promise.race([once(child, 'close'), new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000))]);
	if (child.exitCode === null) child.kill('SIGKILL');
}

async function stopApi() {
	if (!api.listening) return;
	await new Promise((resolveClose, rejectClose) => {
		api.close((error) => (error ? rejectClose(error) : resolveClose()));
	});
}

function canonicalFromHtml(html) {
	const match = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/iu.exec(html);
	if (!match) throw new Error('CANONICAL_RENDERED_PAGE_METADATA_MISSING');
	return new URL(match[1], 'https://24-7labs.com').toString();
}

try {
	await waitUntilReady();
	for (const [caseIndex, testCase] of redirectCases.entries()) {
		const response = await fetch(`${ORIGIN}${testCase.source}`, {
			redirect: 'manual',
			signal: AbortSignal.timeout(5_000),
		});
		if (response.status !== 308) throw new Error('CANONICAL_REDIRECT_SMOKE_STATUS_INVALID');
		const location = new URL(response.headers.get('location'), ORIGIN);
		if (location.origin !== ORIGIN || `${location.pathname}${location.search}` !== testCase.destination) {
			throw new Error(
				`CANONICAL_REDIRECT_SMOKE_LOCATION_INVALID:${caseIndex}:${location.origin}${location.pathname}${location.search}`
			);
		}
		let destination;
		try {
			destination = await fetch(location, {
				redirect: 'manual',
				signal: AbortSignal.timeout(15_000),
			});
		} catch {
			throw new Error(`CANONICAL_REDIRECT_SMOKE_DESTINATION_REQUEST_FAILED:${caseIndex}`);
		}
		if (destination.status >= 300 && destination.status < 400) {
			throw new Error('CANONICAL_REDIRECT_SMOKE_CHAIN_DETECTED');
		}
	}
	for (const renderedCase of renderedCases) {
		const response = await fetch(`${ORIGIN}${renderedCase.path}`, {
			redirect: 'manual',
			signal: AbortSignal.timeout(15_000),
		});
		if (response.status !== 200) {
			throw new Error('CANONICAL_RENDERED_PAGE_STATUS_INVALID');
		}
		if (canonicalFromHtml(await response.text()) !== renderedCase.canonical) {
			throw new Error('CANONICAL_RENDERED_PAGE_METADATA_INVALID');
		}
	}
	process.stdout.write(
		`${JSON.stringify({
			valid: true,
			one_hop_redirect_count: redirectCases.length,
			rendered_canonical_page_count: renderedCases.length,
		})}\n`
	);
} catch (error) {
	if (childOutput) process.stderr.write('Compiled storefront did not pass the canonical redirect smoke.\n');
	throw error;
} finally {
	await stopChild();
	await stopApi();
}

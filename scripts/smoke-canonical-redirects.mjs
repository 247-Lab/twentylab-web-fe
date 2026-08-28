import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const HOST = '127.0.0.1';
const PORT = 4017;
const ORIGIN = `http://${HOST}:${PORT}`;
const START_TIMEOUT_MS = 20_000;
const cases = [
	{ source: '/shop/?campaign=1', destination: '/testing-services?campaign=1' },
	{ source: '/product/a-b-hiv/?campaign=1', destination: '/testing-services/28?campaign=1' },
	{ source: '/blogs/chlamydia-101/?campaign=1', destination: '/chlamydia-101?campaign=1' },
	{ source: '/contact/?campaign=1', destination: '/contact?campaign=1' },
];

if (process.argv.length !== 2) {
	throw new Error('Usage: node scripts/smoke-canonical-redirects.mjs');
}

const nextBinary = resolve('node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBinary, 'start', '--hostname', HOST, '--port', String(PORT)], {
	cwd: process.cwd(),
	env: {
		...process.env,
		NEXT_TELEMETRY_DISABLED: '1',
		NEXT_PUBLIC_MODE: 'prod',
		NEXT_PUBLIC_PROD_API_URL: 'http://127.0.0.1:9',
		NEXT_PUBLIC_SITE_URL: 'https://24-7labs.com',
		NEXT_PUBLIC_CHECKOUT_ENABLED: 'false',
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

try {
	await waitUntilReady();
	for (const [caseIndex, testCase] of cases.entries()) {
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
		const destination = await fetch(location, {
			redirect: 'manual',
			signal: AbortSignal.timeout(5_000),
		});
		if (destination.status >= 300 && destination.status < 400) {
			throw new Error('CANONICAL_REDIRECT_SMOKE_CHAIN_DETECTED');
		}
	}
	process.stdout.write(`${JSON.stringify({ valid: true, one_hop_redirect_count: cases.length })}\n`);
} catch (error) {
	if (childOutput) process.stderr.write('Compiled storefront did not pass the canonical redirect smoke.\n');
	throw error;
} finally {
	await stopChild();
}

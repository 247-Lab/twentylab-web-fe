import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	REQUIRED_LEGACY_EVIDENCE_SOURCES,
	buildLegacySourceInventory,
	buildSourceRecord,
} from '../scripts/legacy-url-inventory-lib.mjs';
import {
	EXECUTE_CONFIRMATION,
	QUERY_PROBE,
	UNKNOWN_PATH,
	executeLegacyUrlAcceptance,
	validateLegacyUrlAcceptanceEnvironment,
} from '../scripts/run-legacy-url-acceptance.mjs';

function xml(...locations) {
	return `<?xml version="1.0"?><urlset>${locations.map((value) => `<url><loc>${value}</loc></url>`).join('')}</urlset>`;
}

function imageXml(location) {
	return `<?xml version="1.0"?><urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://24-7labs.com/</loc><image:image><image:loc>${location}</image:loc></image:image></url></urlset>`;
}

function fixture() {
	const pages = buildSourceRecord({
		kind: 'pages',
		endpoint: 'https://24-7labs.com/sitemap.xml',
		contentType: 'text/xml',
		body: xml('https://24-7labs.com/', 'https://24-7labs.com/legacy/', 'https://24-7labs.com/retired/'),
	});
	const images = buildSourceRecord({
		kind: 'images',
		endpoint: 'https://24-7labs.com/image-sitemap.xml',
		contentType: 'text/xml',
		body: imageXml('https://24-7labs.com/wp-content/uploads/logo.png'),
	});
	const inventory = buildLegacySourceInventory({
		capturedAt: '2026-08-27T12:00:00.000Z',
		pageSource: pages,
		imageSource: images,
	});
	inventory.review = {
		status: 'source_evidence_complete',
		required_evidence_sources: [...REQUIRED_LEGACY_EVIDENCE_SOURCES],
		completed_evidence_sources: [...REQUIRED_LEGACY_EVIDENCE_SOURCES],
		unresolved_evidence_sources: [],
	};
	const contract = {
		schema_version: 1,
		source_set_sha256: inventory.source_set_sha256,
		status: 'approved',
		page_classifications: [
			{ path: '/', disposition: 'preserve' },
			{ path: '/legacy/', disposition: 'redirect', destination: '/contact/' },
			{ path: '/retired/', disposition: 'gone' },
		],
		asset_preservation: {
			status: 'verified',
			path_prefix: '/wp-content/uploads/',
			validated_unique_path_count: 1,
			origin_behavior: 'cloudfront_legacy_media_origin',
		},
	};
	return {
		contract,
		inventory,
		contractSerialized: `${JSON.stringify(contract, null, 2)}\n`,
		inventorySerialized: `${JSON.stringify(inventory, null, 2)}\n`,
	};
}

async function temporaryEnvironment({ mode = 'private_preview' } = {}) {
	const parent = await mkdtemp(join(tmpdir(), 'twentylab-url-acceptance-'));
	return {
		parent,
		environment: {
			LEGACY_URL_ACCEPTANCE_ENABLED: 'true',
			LEGACY_URL_ACCEPTANCE_CONFIRM: EXECUTE_CONFIRMATION,
			LEGACY_URL_ACCEPTANCE_APPROVAL_ID: 'OPS-42',
			LEGACY_URL_ACCEPTANCE_ACCESS_MODE: mode,
			LEGACY_URL_ACCEPTANCE_INDEXING_MODE: mode === 'public' ? 'indexable' : 'noindex',
			LEGACY_URL_ACCEPTANCE_TARGET_ORIGIN: mode === 'public' ? 'https://24-7labs.com' : 'https://preview.example.test',
			LEGACY_URL_ACCEPTANCE_PREVIEW_TOKEN: mode === 'public' ? '' : 'x'.repeat(48),
			LEGACY_URL_ACCEPTANCE_RECEIPT_PATH: join(parent, 'receipt.json'),
		},
	};
}

function html(canonical, { noindex = true } = {}) {
	return `<!doctype html><html><head><link rel="canonical" href="https://24-7labs.com${canonical}">${
		noindex ? '<meta name="robots" content="noindex,nofollow">' : ''
	}</head><body>safe</body></html>`;
}

function response(body, status, headers = {}) {
	return new Response(body, {
		status,
		headers: {
			...(body ? { 'content-type': 'text/html; charset=utf-8' } : {}),
			...headers,
		},
	});
}

function successfulFetcher({ mode = 'private_preview', mutate } = {}) {
	const calls = [];
	const fetchImplementation = async (input, options) => {
		const url = new URL(input);
		calls.push({ url, options });
		const noindexHeaders = mode === 'private_preview' ? { 'x-robots-tag': 'noindex, nofollow, noarchive' } : {};
		let result;
		if (url.pathname === '/') {
			result = response(html('/', { noindex: mode === 'private_preview' }), 200, noindexHeaders);
		} else if (url.pathname === '/legacy/') {
			result = response('', 308, {
				location: `https://24-7labs.com/contact/?${QUERY_PROBE}`,
				...noindexHeaders,
			});
		} else if (url.pathname === '/contact/') {
			result = response(html('/contact/', { noindex: mode === 'private_preview' }), 200, noindexHeaders);
		} else if (url.pathname === '/retired/') {
			result = response('', 410, { 'x-robots-tag': 'noindex, nofollow' });
		} else if (url.pathname === UNKNOWN_PATH) {
			result = response('missing', 404, noindexHeaders);
		} else {
			throw new Error(`Unexpected synthetic request ${url.pathname}`);
		}
		return mutate ? mutate({ url, options, result }) : result;
	};
	return { calls, fetchImplementation };
}

describe('legacy URL live acceptance', () => {
	it('verifies preserved, one-hop redirect, gone, canonical, indexing, query, and unknown-path behavior', async () => {
		const data = fixture();
		const runtime = await temporaryEnvironment();
		const fetcher = successfulFetcher();
		try {
			const result = await executeLegacyUrlAcceptance({
				...data,
				environment: runtime.environment,
				fetchImplementation: fetcher.fetchImplementation,
				now: () => new Date('2026-08-28T03:00:00.000Z'),
			});
			expect(result).toMatchObject({
				classified_page_count: 3,
				preserved_page_count: 1,
				redirected_page_count: 1,
				gone_page_count: 1,
				request_count: 5,
				canonical_contract_verified: true,
				query_preservation_verified: true,
				site_mutated: false,
			});
			expect(fetcher.calls).toHaveLength(5);
			expect(fetcher.calls.every((call) => call.options.redirect === 'manual')).toBe(true);
			expect(
				fetcher.calls.every((call) => call.options.headers['x-24-7labs-preview-authorization'] === 'x'.repeat(48))
			).toBe(true);
			const receiptText = await readFile(runtime.environment.LEGACY_URL_ACCEPTANCE_RECEIPT_PATH, 'utf8');
			expect(receiptText).not.toContain('x'.repeat(48));
			expect(JSON.parse(receiptText).target_origin).toBe('https://preview.example.test');
		} finally {
			await rm(runtime.parent, { recursive: true, force: true });
		}
	});

	it('supports the public/indexable phase only at the canonical production origin and without a preview token', async () => {
		const data = fixture();
		const runtime = await temporaryEnvironment({ mode: 'public' });
		const fetcher = successfulFetcher({ mode: 'public' });
		const originalFetcher = fetcher.fetchImplementation;
		fetcher.fetchImplementation = async (input, options) => {
			const url = new URL(input);
			if (url.origin === 'https://www.24-7labs.com') {
				fetcher.calls.push({ url, options });
				return response('', 308, {
					location: `https://24-7labs.com/?${QUERY_PROBE}`,
				});
			}
			return originalFetcher(input, options);
		};
		try {
			const result = await executeLegacyUrlAcceptance({
				...data,
				environment: runtime.environment,
				fetchImplementation: fetcher.fetchImplementation,
			});
			expect(result.indexing_mode).toBe('indexable');
			expect(result.domain_canonicalization_verified).toBe(true);
			expect(result.request_count).toBe(7);
			expect(fetcher.calls.every((call) => !('x-24-7labs-preview-authorization' in call.options.headers))).toBe(true);
		} finally {
			await rm(runtime.parent, { recursive: true, force: true });
		}
	});

	it('treats trailing-slash differences as contract failures', async () => {
		const data = fixture();
		const runtime = await temporaryEnvironment();
		const fetcher = successfulFetcher({
			mutate: ({ url, result }) =>
				url.pathname === '/contact/'
					? response(html('/contact'), 200, {
							'x-robots-tag': 'noindex,nofollow,noarchive',
						})
					: result,
		});
		try {
			await expect(
				executeLegacyUrlAcceptance({
					...data,
					environment: runtime.environment,
					fetchImplementation: fetcher.fetchImplementation,
				})
			).rejects.toThrow('CANONICAL_MISMATCH');
		} finally {
			await rm(runtime.parent, { recursive: true, force: true });
		}
	});

	it.each([
		[
			'preserved response status',
			({ url, result }) => (url.pathname === '/' ? response('', 302, { location: '/other/' }) : result),
			'DESTINATION_STATUS_INVALID',
		],
		[
			'canonical destination',
			({ url, result }) =>
				url.pathname === '/' ? response(html('/wrong'), 200, { 'x-robots-tag': 'noindex,nofollow,noarchive' }) : result,
			'CANONICAL_MISMATCH',
		],
		[
			'redirect query preservation',
			({ url, result }) => (url.pathname === '/legacy/' ? response('', 308, { location: '/contact/' }) : result),
			'REDIRECT_LOCATION_INVALID',
		],
		[
			'redirect trailing-slash preservation',
			({ url, result }) =>
				url.pathname === '/legacy/' ? response('', 308, { location: `/contact?${QUERY_PROBE}` }) : result,
			'REDIRECT_LOCATION_INVALID',
		],
		[
			'private noindex boundary',
			({ url, result }) => (url.pathname === '/' ? response(html('/'), 200) : result),
			'NOINDEX_MISSING',
		],
		[
			'unknown-path 404 boundary',
			({ url, result }) => (url.pathname === UNKNOWN_PATH ? response(html('/'), 200) : result),
			'UNKNOWN_PATH_INVALID',
		],
	])('fails closed on %s without writing a receipt', async (_name, mutate, errorCode) => {
		const data = fixture();
		const runtime = await temporaryEnvironment();
		const fetcher = successfulFetcher({ mutate });
		try {
			await expect(
				executeLegacyUrlAcceptance({
					...data,
					environment: runtime.environment,
					fetchImplementation: fetcher.fetchImplementation,
				})
			).rejects.toThrow(errorCode);
			await expect(access(runtime.environment.LEGACY_URL_ACCEPTANCE_RECEIPT_PATH)).rejects.toMatchObject({
				code: 'ENOENT',
			});
		} finally {
			await rm(runtime.parent, { recursive: true, force: true });
		}
	});

	it('rejects incomplete or serialization-mismatched evidence before the first request', async () => {
		const data = fixture();
		const runtime = await temporaryEnvironment();
		let requests = 0;
		try {
			data.contract.status = 'review_required';
			data.contractSerialized = `${JSON.stringify(data.contract)}\n`;
			await expect(
				executeLegacyUrlAcceptance({
					...data,
					environment: runtime.environment,
					fetchImplementation: async () => {
						requests += 1;
					},
				})
			).rejects.toThrow('CONTRACT_INCOMPLETE');
			expect(requests).toBe(0);

			const complete = fixture();
			complete.contractSerialized = '{"different":true}\n';
			await expect(
				executeLegacyUrlAcceptance({
					...complete,
					environment: runtime.environment,
					fetchImplementation: async () => {
						requests += 1;
					},
				})
			).rejects.toThrow('CONTRACT_SERIALIZATION_INVALID');
			expect(requests).toBe(0);

			const inventoryMismatch = fixture();
			inventoryMismatch.inventorySerialized = '{"different":true}\n';
			await expect(
				executeLegacyUrlAcceptance({
					...inventoryMismatch,
					environment: runtime.environment,
					fetchImplementation: async () => {
						requests += 1;
					},
				})
			).rejects.toThrow('INVENTORY_SERIALIZATION_INVALID');
			expect(requests).toBe(0);
		} finally {
			await rm(runtime.parent, { recursive: true, force: true });
		}
	});

	it('requires exact mode, origin, token, approval, and an external create-only receipt path', async () => {
		const runtime = await temporaryEnvironment();
		try {
			await expect(validateLegacyUrlAcceptanceEnvironment(runtime.environment)).resolves.toMatchObject({
				accessMode: 'private_preview',
				targetOrigin: 'https://preview.example.test',
			});
			for (const mutate of [
				(env) => {
					env.LEGACY_URL_ACCEPTANCE_ENABLED = 'false';
				},
				(env) => {
					env.LEGACY_URL_ACCEPTANCE_CONFIRM = 'yes';
				},
				(env) => {
					env.LEGACY_URL_ACCEPTANCE_APPROVAL_ID = 'customer-42';
				},
				(env) => {
					env.LEGACY_URL_ACCEPTANCE_INDEXING_MODE = 'indexable';
				},
				(env) => {
					env.LEGACY_URL_ACCEPTANCE_PREVIEW_TOKEN = 'short';
				},
				(env) => {
					env.LEGACY_URL_ACCEPTANCE_TARGET_ORIGIN = 'http://preview.example.test';
				},
			]) {
				const candidate = { ...runtime.environment };
				mutate(candidate);
				await expect(validateLegacyUrlAcceptanceEnvironment(candidate)).rejects.toThrow();
			}
		} finally {
			await rm(runtime.parent, { recursive: true, force: true });
		}
	});
});

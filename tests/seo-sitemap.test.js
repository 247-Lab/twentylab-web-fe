import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	buildMetadata,
	buildMetadataUrl,
	fetchMetadata,
	generateMetadataForPath,
	normalizePath,
	normalizeRedirectPath,
} from '../src/lib/seo';
import { SENSITIVE_NOINDEX_ROUTES } from '../src/lib/publicRoutes';
import { toSitemapEntry } from '../src/lib/sitemap';

describe('SEO, canonical, redirect, and sitemap helpers', () => {
	afterEach(() => vi.unstubAllGlobals());
	it('normalizes canonical and redirect paths consistently', () => {
		expect(normalizePath(' /testing-services/ ')).toBe('/testing-services');
		expect(normalizeRedirectPath('//blogs/example//')).toBe('/blogs/example');
	});

	it('builds route-specific canonical metadata', () => {
		const metadata = buildMetadata(null, { title: 'Fallback', description: 'Description' }, '/about/');

		expect(metadata).toMatchObject({
			title: 'Fallback',
			description: 'Description',
			alternates: { canonical: '/about' },
		});
	});

	it.each(SENSITIVE_NOINDEX_ROUTES)('forces noindex in generated metadata for %s', async (path) => {
		vi.stubGlobal('fetch', async () => ({
			ok: true,
			json: async () => ({ path, title: 'Backend supplied title' }),
		}));

		const generateMetadata = generateMetadataForPath(path);
		await expect(generateMetadata()).resolves.toMatchObject({
			alternates: { canonical: path },
			robots: {
				index: false,
				follow: false,
				nocache: true,
				googleBot: { index: false, follow: false, noimageindex: true },
			},
		});
	});

	it('exports noindex metadata from the actual appointment page', async () => {
		vi.stubGlobal('fetch', async () => ({
			ok: true,
			json: async () => ({
				path: '/schedule-appointment',
				title: 'Schedule an Appointment',
			}),
		}));
		const { generateScheduleAppointmentMetadata } = await import('../src/app/(forms)/schedule-appointment/metadata.js');

		await expect(generateScheduleAppointmentMetadata()).resolves.toMatchObject({
			alternates: { canonical: '/schedule-appointment' },
			robots: {
				index: false,
				follow: false,
				nocache: true,
				googleBot: { index: false, follow: false, noimageindex: true },
			},
		});
	});

	it('fetches only the public, single-path metadata endpoint', async () => {
		const fetchImplementation = async (url) => {
			expect(url).toBe('https://api.24-7labs.com/api/seo?path=%2Fabout');
			expect(url).not.toContain('/seo/all');
			return {
				ok: true,
				json: async () => ({ path: '/about', title: 'About 24-7 Labs' }),
			};
		};

		await expect(
			fetchMetadata('/about/', {
				endpoint: 'https://api.24-7labs.com/api/seo',
				fetchImplementation,
			})
		).resolves.toEqual({ path: '/about', title: 'About 24-7 Labs' });
	});

	it('encodes metadata paths without changing the endpoint route', () => {
		expect(buildMetadataUrl('https://api.24-7labs.com/api/seo', '/blogs/health & wellness')).toBe(
			'https://api.24-7labs.com/api/seo?path=%2Fblogs%2Fhealth+%26+wellness'
		);
	});

	it('creates stable sitemap URLs', () => {
		const entry = toSitemapEntry('/blogs/health', '2026-08-13T12:00:00Z', 'https://24-7labs.com');

		expect(entry.url).toBe('https://24-7labs.com/blogs/health');
		expect(entry.lastModified.toISOString()).toBe('2026-08-13T12:00:00.000Z');
	});

	it('does not fabricate a changing last-modified date when none exists', () => {
		expect(toSitemapEntry('/about', undefined, 'https://24-7labs.com')).toEqual({
			url: 'https://24-7labs.com/about',
		});
	});
});

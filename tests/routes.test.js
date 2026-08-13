import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_STATIC_ROUTES, SENSITIVE_NOINDEX_ROUTES } from '../src/lib/publicRoutes';

const requiredTestingPaths = [
	'/allergy-testing',
	'/dna-testing',
	'/drug-testing',
	'/heart-testing',
	'/hormone-testing',
	'/routine-health-testing',
	'/std-testing',
];

describe('indexable public route contract', () => {
	it('contains unique, source-backed routes with usable llms metadata', () => {
		const paths = INDEXABLE_STATIC_ROUTES.map(({ path }) => path);
		expect(new Set(paths).size).toBe(paths.length);

		for (const route of INDEXABLE_STATIC_ROUTES) {
			const source = fileURLToPath(new URL(`../src/app/${route.source}`, import.meta.url));
			expect(existsSync(source), `${route.path} must resolve to ${route.source}`).toBe(true);
			expect(route.title.trim()).not.toBe('');
			expect(route.description.trim()).not.toBe('');
		}
	});

	it('includes business, trust, and all seven static testing routes', () => {
		const paths = new Set(INDEXABLE_STATIC_ROUTES.map(({ path }) => path));
		expect(paths.has('/business-opportunities')).toBe(true);
		expect(paths.has('/trust-standards')).toBe(true);
		for (const path of requiredTestingPaths) expect(paths.has(path)).toBe(true);
	});

	it('does not index checkout or health-information intake forms', () => {
		const paths = INDEXABLE_STATIC_ROUTES.map(({ path }) => path);
		for (const path of SENSITIVE_NOINDEX_ROUTES) expect(paths).not.toContain(path);
	});
});

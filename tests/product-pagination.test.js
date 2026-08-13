import { describe, expect, it, vi } from 'vitest';
import { collectProductPages } from '../src/lib/api';

function productPage(page, total = 205) {
	const limit = 100;
	const start = (page - 1) * limit;
	return {
		products: Array.from({ length: Math.min(limit, Math.max(0, total - start)) }, (_, index) => ({
			id: start + index + 1,
		})),
		total,
		pages: Math.ceil(total / limit),
		page,
		limit,
	};
}

describe('product pagination traversal', () => {
	it('collects every bounded page without silently truncating the catalog', async () => {
		const fetchPage = vi.fn(async (page) => productPage(page));
		const products = await collectProductPages(fetchPage);

		expect(products).toHaveLength(205);
		expect(products.at(-1).id).toBe(205);
		expect(fetchPage.mock.calls.map(([page, limit]) => [page, limit])).toEqual([
			[1, 100],
			[2, 100],
			[3, 100],
		]);
	});

	it('fails explicitly when pagination metadata would produce an incomplete catalog', async () => {
		await expect(
			collectProductPages(async () => ({ products: [], total: 1, pages: 1, page: 1, limit: 100 }))
		).rejects.toThrow('incomplete');
	});
});

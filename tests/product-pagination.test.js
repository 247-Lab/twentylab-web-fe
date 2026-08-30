import { describe, expect, it, vi } from 'vitest';
import {
	collectProductPages,
	normalizeBlogList,
	normalizeCategoryList,
	normalizeBlog,
	normalizeProduct,
} from '../src/lib/api';

function publicProduct(overrides = {}) {
	return {
		id: 7,
		name: 'Synthetic product',
		regular_price: '49.00',
		sale_price: null,
		stock_quantity: 5,
		published: true,
		visible: true,
		variant_of: null,
		categories: [],
		variants: [],
		...overrides,
	};
}

function publicBlog(overrides = {}) {
	return {
		id: 8,
		title: 'Synthetic post',
		slug: 'synthetic-post',
		blogcontent: '<p>Useful synthetic content</p>',
		isactive: true,
		created_at: '2026-08-28T12:00:00.000Z',
		categories: [],
		...overrides,
	};
}

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

	it('rejects repeated product IDs across pages instead of hiding an omitted record', async () => {
		await expect(
			collectProductPages(async (page) => ({
				products: [{ id: 1 }],
				total: 2,
				pages: 2,
				page,
				limit: 1,
			}))
		).rejects.toThrow('duplicate or invalid product');
	});
});

describe('product relationship normalization', () => {
	it('rejects a product instead of silently hiding a malformed variant', () => {
		expect(
			normalizeProduct(
				publicProduct({
					variants: [{ name: 'Variant missing its ID' }],
				})
			)
		).toBeNull();
	});

	it('rejects a product instead of silently hiding a malformed category', () => {
		expect(
			normalizeProduct(
				publicProduct({
					categories: [{ name: 'Category missing its ID' }],
				})
			)
		).toBeNull();
	});

	it('rejects non-numeric identifiers before they reach cart and route controls', () => {
		expect(normalizeProduct(publicProduct({ id: { unsafe: true } }))).toBeNull();
	});

	it('uses a safe placeholder when an API image field is not text', () => {
		expect(normalizeProduct(publicProduct({ main_image: { unsafe: true } }))?.mainImage).toBe(
			'/images/placeholder.png'
		);
	});

	it.each([
		['blank name', { name: '  ' }],
		['missing regular price', { regular_price: null }],
		['zero regular price', { regular_price: '0.00' }],
		['sale above regular price', { sale_price: '50.00' }],
		['string visibility', { visible: 'false' }],
		['fractional stock', { stock_quantity: 1.5 }],
		['malformed relationship envelope', { categories: {} }],
	])('rejects %s instead of publishing misleading product content', (_label, override) => {
		expect(normalizeProduct(publicProduct(override))).toBeNull();
	});

	it('accepts the intentionally smaller public variant record', () => {
		const normalized = normalizeProduct(
			publicProduct({
				variants: [{ id: 9, name: 'Variant', regular_price: '59.00', sale_price: null }],
			})
		);
		expect(normalized?.variants).toEqual([
			expect.objectContaining({ id: 9, name: 'Variant', regularPrice: 59, stockQuantity: null }),
		]);
	});

	it('accepts a zero-priced main product when a priced public variant is available', () => {
		const normalized = normalizeProduct(
			publicProduct({
				regular_price: '0.00',
				variants: [{ id: 9, name: 'Variant', regular_price: '59.00', sale_price: null }],
			})
		);

		expect(normalized).toMatchObject({ regularPrice: 0 });
		expect(normalized?.variants).toHaveLength(1);
	});

	it('rejects duplicate or self-referential relationship identifiers', () => {
		expect(
			normalizeProduct(
				publicProduct({
					categories: [
						{ id: 2, name: 'Screening' },
						{ id: 2, name: 'Screening' },
					],
				})
			)
		).toBeNull();
		expect(
			normalizeProduct(
				publicProduct({
					variants: [
						{ id: 9, name: 'Variant', regular_price: '59.00', sale_price: null },
						{ id: 9, name: 'Variant', regular_price: '59.00', sale_price: null },
					],
				})
			)
		).toBeNull();
		expect(
			normalizeProduct(
				publicProduct({
					variants: [{ id: 7, name: 'Variant', regular_price: '59.00', sale_price: null }],
				})
			)
		).toBeNull();
	});
});

describe('blog relationship normalization', () => {
	it('rejects a post instead of publishing a category link without an ID', () => {
		expect(
			normalizeBlog(
				publicBlog({
					categories: [{ name: 'Category missing its ID' }],
				})
			)
		).toBeNull();
	});

	it('rejects a post whose identifier cannot produce a safe route', () => {
		expect(normalizeBlog(publicBlog({ id: '../unsafe' }))).toBeNull();
	});

	it.each([
		['missing slug', { slug: null }],
		['unsafe slug', { slug: '../unsafe' }],
		['blank title', { title: ' ' }],
		['blank content', { blogcontent: '' }],
		['inactive response', { isactive: false }],
		['invalid creation date', { created_at: 'not-a-date' }],
		['blank category name', { categories: [{ id: 2, name: '' }] }],
	])('rejects %s instead of inventing or partially publishing a blog', (_label, override) => {
		expect(normalizeBlog(publicBlog(override))).toBeNull();
	});

	it('rejects duplicate category relationships', () => {
		expect(
			normalizeBlog(
				publicBlog({
					categories: [
						{ id: 2, name: 'Screening' },
						{ id: 2, name: 'Screening' },
					],
				})
			)
		).toBeNull();
	});
});

describe('public content list identity', () => {
	it('rejects duplicate blog IDs or routes instead of publishing ambiguous links', () => {
		const post = publicBlog();
		expect(() => normalizeBlogList([post, { ...post }])).toThrow('Blog content could not be loaded');
		expect(() => normalizeBlogList([post, { ...post, id: 9 }])).toThrow('Blog content could not be loaded');
	});

	it('rejects duplicate category IDs instead of publishing ambiguous filters', () => {
		const category = { id: 2, name: 'Screening', description: '', main_image: null };
		expect(() => normalizeCategoryList([category, { ...category }])).toThrow('Category content could not be loaded');
	});
});

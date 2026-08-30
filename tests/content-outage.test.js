import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/lib/api';
import { notFound } from 'next/navigation';
import ProductDetailRoute from '../src/components/testing-services/ProductDetailRoute';
import BlogDetailsRoute from '../src/app/[slug]/page';
import BlogsRoute from '../src/app/blogs/page';
import TestingServicesRoute from '../src/app/testing-services/page';
import sitemap from '../src/app/sitemap';

vi.mock('next-intl/server', () => ({ getLocale: async () => 'en', getMessages: async () => ({}) }));
vi.mock('next/navigation', () => ({
	notFound: vi.fn(() => {
		throw new Error('REAL_NOT_FOUND');
	}),
}));
vi.mock('../src/lib/api', () => ({ fetchProducts: vi.fn(), fetchCategories: vi.fn(), fetchBlogs: vi.fn() }));
vi.mock('../src/components/testing-services/TestingServiceDetailsPage', () => ({ default: () => null }));
vi.mock('../src/components/testing-services/TestingServicesPage', () => ({ default: () => null }));
vi.mock('../src/components/blog/BlogDetailPage', () => ({ default: () => null }));
vi.mock('../src/components/blog/BlogListPage', () => ({ default: () => null }));
globalThis.React = React;
beforeEach(() => {
	vi.clearAllMocks();
	api.fetchProducts.mockResolvedValue([]);
	api.fetchCategories.mockResolvedValue([]);
	api.fetchBlogs.mockResolvedValue([]);
});
describe('content availability versus absence', () => {
	it('does not turn a product outage into a not-found page', async () => {
		api.fetchProducts.mockRejectedValue(new Error('CONTENT_UNAVAILABLE'));
		await expect(ProductDetailRoute({ id: 17 })).rejects.toThrow('CONTENT_UNAVAILABLE');
		expect(notFound).not.toHaveBeenCalled();
	});
	it('does not turn a blog outage into a not-found page', async () => {
		api.fetchBlogs.mockRejectedValue(new Error('CONTENT_UNAVAILABLE'));
		await expect(BlogDetailsRoute({ params: Promise.resolve({ slug: 'synthetic-post' }) })).rejects.toThrow(
			'CONTENT_UNAVAILABLE'
		);
		expect(notFound).not.toHaveBeenCalled();
	});
	it('uses a genuine not-found result only after successful content retrieval', async () => {
		await expect(ProductDetailRoute({ id: 17 })).rejects.toThrow('REAL_NOT_FOUND');
	});
	it('does not publish empty lists or an incomplete sitemap during an outage', async () => {
		api.fetchProducts.mockRejectedValue(new Error('CONTENT_UNAVAILABLE'));
		api.fetchBlogs.mockRejectedValue(new Error('CONTENT_UNAVAILABLE'));
		await expect(TestingServicesRoute({ searchParams: Promise.resolve({}) })).rejects.toThrow('CONTENT_UNAVAILABLE');
		await expect(BlogsRoute({ searchParams: Promise.resolve({}) })).rejects.toThrow('CONTENT_UNAVAILABLE');
		await expect(sitemap()).rejects.toThrow('CONTENT_UNAVAILABLE');
	});
});

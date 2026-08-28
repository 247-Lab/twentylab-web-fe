import { fetchBlogs, fetchCategories, fetchProducts } from '@/lib/api';
import { toCanonicalBlogPath } from '@/lib/blogRoutes';
import { INDEXABLE_STATIC_ROUTES } from '@/lib/publicRoutes';
import { toSitemapEntry } from '@/lib/sitemap';

export default async function sitemap() {
	const [products, categories, blogs] = await Promise.all([
		fetchProducts('en').catch(() => []),
		fetchCategories('en').catch(() => []),
		fetchBlogs('en').catch(() => []),
	]);

	const entries = new Map();
	for (const { path } of INDEXABLE_STATIC_ROUTES) entries.set(path, toSitemapEntry(path));

	for (const product of products || []) {
		entries.set(`/testing-services/${product.id}`, toSitemapEntry(`/testing-services/${product.id}`));
	}

	for (const category of categories || []) {
		entries.set(`/categories/${category.id}`, toSitemapEntry(`/categories/${category.id}`));
	}

	for (const blog of blogs || []) {
		if (blog?.slug) {
			const path = toCanonicalBlogPath(blog.slug);
			entries.set(path, toSitemapEntry(path, blog.updated_at || blog.created_at));
		}
	}

	return Array.from(entries.values());
}

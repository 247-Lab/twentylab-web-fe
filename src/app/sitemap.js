import { fetchBlogs, fetchCategories, fetchProducts } from '@/lib/api';
import { toCanonicalBlogPath } from '@/lib/blogRoutes';
import { toProductDetailPath } from '@/lib/productRoutes';
import { INDEXABLE_STATIC_ROUTES } from '@/lib/publicRoutes';
import { toSitemapEntry } from '@/lib/sitemap';

// Image builds have no backend. Generate against the runtime internal API rather
// than permanently caching a build-time sitemap with no imported content.
export const dynamic = 'force-dynamic';

export default async function sitemap() {
	const [products, categories, blogs] = await Promise.all([
		fetchProducts('en'),
		fetchCategories('en'),
		fetchBlogs('en'),
	]);

	const entries = new Map();
	for (const { path } of INDEXABLE_STATIC_ROUTES) entries.set(path, toSitemapEntry(path));

	for (const product of products || []) {
		const path = toProductDetailPath(product.id);
		entries.set(
			path,
			toSitemapEntry(path, product.updated_at || product.updatedAt || product.created_at || product.createdAt)
		);
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

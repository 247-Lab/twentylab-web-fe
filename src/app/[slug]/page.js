import { getLocale, getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import BlogDetailPage from '@/components/blog/BlogDetailPage';
import { fetchBlogs, fetchCategories, fetchProducts } from '@/lib/api';
import { normalizeBlogSlug, toCanonicalBlogPath } from '@/lib/blogRoutes';
import { toCategoryLink, toProductCard, toRecentPost } from '@/lib/content-view-models';
import { resolveMetadata } from '@/lib/seo';
import OptionalContentNotice from '@/components/common/OptionalContentNotice';

export async function generateMetadata({ params }) {
	const [messages, resolvedParams] = await Promise.all([getMessages(), params]);
	let slug;

	let canonicalPath;
	try {
		slug = normalizeBlogSlug(resolvedParams?.slug);
		canonicalPath = toCanonicalBlogPath(slug);
	} catch {
		return {};
	}

	let blogTitle = messages?.BlogDetailPage?.fallbackTitle;
	let blogDescription = messages?.BlogDetailPage?.metadata?.description;
	try {
		const blogs = await fetchBlogs('en');
		const blog = blogs.find((entry) => entry.slug === slug);
		if (blog?.title) blogTitle = blog.title;
		if (blog?.description) blogDescription = blog.description;
	} catch {
		blogTitle = messages?.BlogDetailPage?.fallbackTitle;
	}

	return resolveMetadata(canonicalPath, {
		title: messages?.BlogDetailPage?.metadata?.title?.replace('{title}', blogTitle),
		description: blogDescription || messages?.BlogDetailPage?.metadata?.description,
	});
}

export default async function CanonicalBlogDetailsRoute({ params }) {
	const [locale, resolvedParams] = await Promise.all([getLocale(), params]);
	let slug;

	try {
		slug = normalizeBlogSlug(resolvedParams?.slug);
	} catch {
		notFound();
	}

	const [blogs, loadedCategories, loadedProducts] = await Promise.all([
		fetchBlogs(locale),
		fetchCategories(locale).catch(() => null),
		fetchProducts(locale).catch(() => null),
	]);
	const categories = loadedCategories || [];
	const products = loadedProducts || [];

	const blog = blogs.find((entry) => entry.slug === slug);
	if (!blog) notFound();

	const relatedCategoryIds = new Set((blog.categories || []).map((item) => String(item.id)));
	const recentPosts = blogs
		.filter((entry) => String(entry.id) !== String(blog.id))
		.sort((left, right) => new Date(right.created_at || 0).valueOf() - new Date(left.created_at || 0).valueOf())
		.sort((left, right) => {
			const leftHasCommon = (left.categories || []).some((category) => relatedCategoryIds.has(String(category.id)));
			const rightHasCommon = (right.categories || []).some((category) => relatedCategoryIds.has(String(category.id)));
			return Number(rightHasCommon) - Number(leftHasCommon);
		})
		.slice(0, 4);

	const relatedProducts = products
		.filter((product) =>
			(blog.categories || []).some((category) =>
				(product.categories || []).some(
					(productCategory) =>
						String(productCategory.id) === String(category.id) ||
						String(productCategory.name || '').toLowerCase() === String(category.name || '').toLowerCase()
				)
			)
		)
		.slice(0, 4);

	const relatedProductsToShow = relatedProducts.length > 0 ? relatedProducts : products.slice(0, 4);

	return (
		<>
			<OptionalContentNotice unavailable={loadedCategories === null || loadedProducts === null} />
			<BlogDetailPage
				blog={blog}
				categories={categories.map(toCategoryLink)}
				recentPosts={recentPosts.map(toRecentPost)}
				relatedProducts={relatedProductsToShow.map(toProductCard)}
				locale={locale}
			/>
		</>
	);
}

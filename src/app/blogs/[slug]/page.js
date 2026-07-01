import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import BlogDetailPage from '@/components/blog/BlogDetailPage';
import { fetchBlogs, fetchCategories, fetchProducts } from '@/lib/api';
import { getLocaleFromCookieStore } from '@/lib/locale';
import { loadMessages } from '@/i18n/loadMessages';
import { resolveMetadata } from '@/lib/seo';

export async function generateMetadata({ params }) {
	const cookieStore = await cookies();
	const locale = getLocaleFromCookieStore(cookieStore);
	const messages = await loadMessages(locale);
	const resolvedParams = await params;
	const slug = resolvedParams?.slug;

	let blogTitle = messages?.BlogDetailPage?.fallbackTitle;
	let blogDescription = messages?.BlogDetailPage?.metadata?.description;
	try {
		// Always fetch English blogs to get English title for metadata
		const blogs = await fetchBlogs('en');
		const blog = blogs.find((entry) => entry.slug === slug);
		if (blog?.title) {
			blogTitle = blog.title;
		}
		if (blog?.description) {
			blogDescription = blog.description;
		}
	} catch {
		blogTitle = messages?.BlogDetailPage?.fallbackTitle;
	}

	return resolveMetadata(`/blogs/${slug}`, {
		title: messages?.BlogDetailPage?.metadata?.title?.replace('{title}', blogTitle),
		description: blogDescription || messages?.BlogDetailPage?.metadata?.description,
	});
}

export default async function BlogDetailsRoute({ params }) {
	const cookieStore = await cookies();
	const locale = getLocaleFromCookieStore(cookieStore);
	const resolvedParams = await params;
	const slug = resolvedParams?.slug;

	const [blogs, categories, products] = await Promise.all([
		fetchBlogs(locale).catch(() => []),
		fetchCategories(locale).catch(() => []),
		fetchProducts(locale).catch(() => []),
	]);

	const blog = blogs.find((entry) => entry.slug === slug);
	if (!blog) {
		notFound();
	}

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
		<BlogDetailPage
			blog={blog}
			categories={categories}
			recentPosts={recentPosts}
			relatedProducts={relatedProductsToShow}
			locale={locale}
		/>
	);
}

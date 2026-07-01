import { getLocale } from 'next-intl/server';
import { fetchBlogs, fetchCategories } from '@/lib/api';
import { toBlogCard, toCategoryLink } from '@/lib/content-view-models';
import BlogListPage from '@/components/blog/BlogListPage';
import { generateMetadataForPath } from '@/lib/seo';

export const generateMetadata = generateMetadataForPath('/blogs');

export default async function BlogsRoute({ searchParams }) {
	const [locale, resolvedSearchParams = {}] = await Promise.all([getLocale(), searchParams]);
	const initialCategory = String(resolvedSearchParams?.category || 'all');

	const [blogs, categories] = await Promise.all([
		fetchBlogs(locale).catch(() => []),
		fetchCategories(locale).catch(() => []),
	]);
	const blogSummaries = blogs.map(toBlogCard);
	const categorySummaries = categories.map(toCategoryLink);

	return (
		<BlogListPage
			blogs={blogSummaries}
			categories={categorySummaries}
			locale={locale}
			initialCategory={initialCategory}
		/>
	);
}

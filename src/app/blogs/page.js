import { getLocale } from 'next-intl/server';
import { fetchBlogs, fetchCategories } from '@/lib/api';
import { toBlogCard, toCategoryLink } from '@/lib/content-view-models';
import BlogListPage from '@/components/blog/BlogListPage';
import { generateMetadataForPath } from '@/lib/seo';
import OptionalContentNotice from '@/components/common/OptionalContentNotice';

export const generateMetadata = generateMetadataForPath('/blogs');

export default async function BlogsRoute({ searchParams }) {
	const [locale, resolvedSearchParams = {}] = await Promise.all([getLocale(), searchParams]);
	const initialCategory = String(resolvedSearchParams?.category || 'all');

	const [blogs, categories] = await Promise.all([fetchBlogs(locale), fetchCategories(locale).catch(() => null)]);
	const blogSummaries = blogs.map(toBlogCard);
	const categorySummaries = (categories || []).map(toCategoryLink);

	return (
		<>
			<OptionalContentNotice unavailable={categories === null} />
			<BlogListPage
				blogs={blogSummaries}
				categories={categorySummaries}
				locale={locale}
				initialCategory={initialCategory}
			/>
		</>
	);
}

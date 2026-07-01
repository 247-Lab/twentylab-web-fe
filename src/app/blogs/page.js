import { cookies } from 'next/headers';
import { fetchBlogs, fetchCategories } from '@/lib/api';
import { summarizeHtml } from '@/lib/htmlSanitizer';
import { getLocaleFromCookieStore } from '@/lib/locale';
import BlogListPage from '@/components/blog/BlogListPage';
import { generateMetadataForPath } from '@/lib/seo';

export const generateMetadata = generateMetadataForPath('/blogs');

export default async function BlogsRoute({ searchParams }) {
	const cookieStore = await cookies();
	const locale = getLocaleFromCookieStore(cookieStore);
	const resolvedSearchParams = (await searchParams) || {};
	const initialCategory = String(resolvedSearchParams?.category || 'all');

	const [blogs, categories] = await Promise.all([
		fetchBlogs(locale).catch(() => []),
		fetchCategories(locale).catch(() => []),
	]);
	const blogSummaries = blogs.map((blog) => ({
		...blog,
		blogcontent: summarizeHtml(blog.blogcontent, 260),
	}));
	const categorySummaries = categories.map(({ id, name }) => ({ id, name }));

	return (
		<BlogListPage
			blogs={blogSummaries}
			categories={categorySummaries}
			locale={locale}
			initialCategory={initialCategory}
		/>
	);
}

import { SITE_URL } from '@/lib/seo';
import { INDEXABLE_STATIC_ROUTES } from '@/lib/publicRoutes';

function formatPath(path) {
	return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
}

export async function GET() {
	const pages = INDEXABLE_STATIC_ROUTES.map(
		({ title, path, description }) => `- [${title}](${formatPath(path)}): ${description}`
	).join('\n');

	const body = `# 24-7 Labs

> 24-7 Labs provides diagnostic and testing services in Tampa, including DNA, STD, drug, routine blood, and walk-in lab testing.

## Website

- [Sitemap](${SITE_URL}/sitemap.xml)

## Pages

${pages}
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
}

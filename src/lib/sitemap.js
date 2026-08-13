import { SITE_URL } from './seo';

export function toSitemapEntry(path, updatedAt, siteUrl = SITE_URL) {
	const pathname = path === '/' ? '' : path;

	return {
		url: `${siteUrl}${pathname}`,
		...(updatedAt ? { lastModified: new Date(updatedAt) } : {}),
	};
}

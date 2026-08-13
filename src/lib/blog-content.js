import { resolveImageUrl } from './api';

function decodeHtmlEntities(value) {
	if (!value) {
		return '';
	}

	return value
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ');
}

export function resolveBlogImageUrl(value, config) {
	if (!value) {
		return '/images/placeholder.png';
	}
	return resolveImageUrl(value, config);
}

export function parseBlogContent(blogcontent) {
	if (blogcontent && typeof blogcontent === 'object') {
		if (typeof blogcontent.content === 'string' && !blogcontent.blocks) {
			return {
				blocks: [
					{
						type: 'legacy-html',
						data: { html: blogcontent.content },
					},
				],
			};
		}

		if (Array.isArray(blogcontent.blocks)) {
			return blogcontent;
		}
	}

	if (typeof blogcontent === 'object' && blogcontent !== null && Array.isArray(blogcontent.blocks)) {
		return blogcontent;
	}

	if (typeof blogcontent === 'string') {
		try {
			const parsed = JSON.parse(blogcontent);
			if (parsed && typeof parsed.content === 'string' && !parsed.blocks) {
				return {
					blocks: [
						{
							type: 'legacy-html',
							data: { html: parsed.content },
						},
					],
				};
			}

			if (parsed && Array.isArray(parsed.blocks)) {
				return parsed;
			}
		} catch {
			return {
				blocks: [
					{
						type: 'legacy-html',
						data: { html: decodeHtmlEntities(blogcontent) },
					},
				],
			};
		}
	}

	return {
		blocks: [],
	};
}

function stripHtml(value) {
	if (!value) {
		return '';
	}

	return decodeHtmlEntities(value)
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function extractBlogSnippet(blogcontent, maxLength = 190) {
	const parsed = parseBlogContent(blogcontent);

	const pieces = [];
	for (const block of parsed.blocks || []) {
		if (block?.type === 'paragraph' || block?.type === 'heading' || block?.type === 'quote') {
			pieces.push(stripHtml(block?.data?.text || ''));
		}

		if (block?.type === 'legacy-html') {
			pieces.push(stripHtml(block?.data?.html || ''));
		}

		if (pieces.join(' ').length >= maxLength) {
			break;
		}
	}

	const combined = pieces.join(' ').replace(/\s+/g, ' ').trim();
	if (!combined) {
		return '';
	}

	if (combined.length <= maxLength) {
		return combined;
	}

	return `${combined.slice(0, maxLength).trimEnd()}...`;
}

export function formatBlogDate(value, locale = 'en') {
	if (!value) {
		return '';
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.valueOf())) {
		return '';
	}

	const formatter = new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});

	return formatter.format(parsed);
}

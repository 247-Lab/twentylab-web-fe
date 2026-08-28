/**
 * HTML Rendering Utilities
 */

import sanitizeHtmlLibrary from 'sanitize-html';
import { normalizeSameOriginMediaUrl } from './api';

const ALLOWED_TAGS = [
	'a',
	'b',
	'blockquote',
	'br',
	'cite',
	'code',
	'div',
	'em',
	'figcaption',
	'figure',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'hr',
	'i',
	'img',
	'li',
	'ol',
	'p',
	'pre',
	's',
	'span',
	'strong',
	'sub',
	'sup',
	'u',
	'ul',
];

/**
 * Sanitizes CMS-authored rich text with a deliberately small allow-list.
 * Event handlers, scripts, iframes, inline styles, and unsafe URL schemes are removed.
 *
 * @param {string} html - Untrusted HTML string
 * @returns {string} HTML safe for React's dangerouslySetInnerHTML
 */
export function sanitizeCmsHtml(html) {
	return sanitizeHtmlLibrary(String(html || ''), {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: {
			a: ['href', 'name', 'target', 'rel'],
			code: ['class'],
			img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
			pre: ['class'],
		},
		allowedSchemes: ['http', 'https', 'mailto', 'tel'],
		allowedSchemesByTag: {
			a: ['http', 'https', 'mailto', 'tel'],
			img: ['http', 'https'],
		},
		allowProtocolRelative: false,
		transformTags: {
			img: (tagName, attribs) => ({
				tagName,
				attribs: { ...attribs, src: normalizeSameOriginMediaUrl(attribs.src) },
			}),
			a: (tagName, attribs) => {
				const safeAttributes = { ...attribs };
				const target = String(attribs.target || '').toLowerCase();

				if (target === '_blank') {
					const rel = new Set(
						String(attribs.rel || '')
							.toLowerCase()
							.split(/\s+/)
							.filter(Boolean)
					);
					rel.delete('opener');
					rel.add('noopener');
					rel.add('noreferrer');
					safeAttributes.target = '_blank';
					safeAttributes.rel = [...rel].join(' ');
				} else if (target === '_self') {
					safeAttributes.target = '_self';
				} else {
					delete safeAttributes.target;
				}

				return { tagName, attribs: safeAttributes };
			},
		},
	});
}

/**
 * Extracts plain text from HTML by stripping tags
 * @param {string} html - HTML string
 * @returns {string} Plain text without HTML tags
 */
export function stripHtmlTags(html) {
	if (!html) return '';

	// Use regex-based approach on both server and client for consistency
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Summarizes text by extracting plain text from HTML and truncating
 * @param {string} htmlOrText - HTML or plain text
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Plain text, truncated if necessary
 */
export function summarizeHtml(htmlOrText, maxLength = 130) {
	if (!htmlOrText) return '';

	// Extract plain text from HTML
	let text = stripHtmlTags(htmlOrText);

	// Truncate if necessary
	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength).trim()}...`;
}

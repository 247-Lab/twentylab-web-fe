import { describe, expect, it } from 'vitest';
import { sanitizeCmsHtml } from '../src/lib/htmlSanitizer';

describe('sanitizeCmsHtml', () => {
	it('removes executable CMS markup while preserving intended formatting', () => {
		const result = sanitizeCmsHtml(
			'<p onclick="steal()"><strong>Safe</strong><script>alert(1)</script><img src="https://24-7labs.com/wp-content/uploads/example.jpg" alt="Lab" onerror="steal()"></p>'
		);

		expect(result).toContain('<strong>Safe</strong>');
		expect(result).toMatch(/src="(?:https:\/\/24-7labs\.com)?\/wp-content\/uploads\/example\.jpg"/);
		expect(result).not.toMatch(/onclick|onerror|<script/i);
	});

	it('removes active-content image schemes', () => {
		expect(sanitizeCmsHtml('<img src="data:text/html,unsafe" alt="unsafe">')).not.toContain('src=');
	});

	it('removes SVG animation content rather than applying URL rules to it', () => {
		const result = sanitizeCmsHtml(
			'<svg><a><animate attributeName="href" values="#safe;javascript:alert(1)" dur=".01s" fill="freeze"></animate><text>Read</text></a></svg>'
		);

		expect(result).not.toMatch(/<svg|<animate|javascript:/i);
	});

	it('rejects unsafe link schemes and protects new tabs', () => {
		const result = sanitizeCmsHtml('<a href="javascript:alert(1)" target="_BLANK" rel="opener sponsored">Read</a>');

		expect(result).toContain('target="_blank"');
		expect(result).toContain('rel="sponsored noopener noreferrer"');
		expect(result).not.toMatch(/(?:^|\s)opener(?:\s|$)/);
	});

	it('removes named browsing targets while preserving _self', () => {
		expect(sanitizeCmsHtml('<a href="https://example.test" target="shared-window">Read</a>')).toBe(
			'<a href="https://example.test">Read</a>'
		);
		expect(sanitizeCmsHtml('<a href="https://example.test" target="_SELF">Read</a>')).toBe(
			'<a href="https://example.test" target="_self">Read</a>'
		);
	});
});

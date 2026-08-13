import { describe, expect, it } from 'vitest';
import { resolveApiOrigin, resolveImageUrl } from '../src/lib/api';
import { resolveBlogImageUrl } from '../src/lib/blog-content';

const productionEnvironment = {
	mode: 'prod',
	prodApiUrl: 'https://api.24-7labs.com',
	internalApiUrl: 'http://backend:3000',
};
const developmentEnvironment = {
	mode: 'dev',
	devApiUrl: 'http://localhost:8080',
};

describe('public and server API configuration', () => {
	it('uses the internal origin only for server API calls', () => {
		expect(resolveApiOrigin(productionEnvironment)).toBe('http://backend:3000/api');
	});

	it('keeps media URLs browser-reachable and outside the /api prefix', () => {
		expect(resolveImageUrl('/uploads/products/example.jpg', productionEnvironment)).toBe(
			'https://api.24-7labs.com/uploads/products/example.jpg'
		);
	});

	it('resolves synthetic media through the browser-visible gateway', () => {
		expect(resolveImageUrl('/uploads/products/example.jpg', developmentEnvironment)).toBe(
			'http://localhost:8080/uploads/products/example.jpg'
		);
	});

	it('resolves inherited relative blog media through the compiled public origin', () => {
		expect(resolveBlogImageUrl('uploads/blogcontent/example.jpg', productionEnvironment)).toBe(
			'https://api.24-7labs.com/uploads/blogcontent/example.jpg'
		);
	});
});

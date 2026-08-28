import { afterEach, describe, expect, it, vi } from 'vitest';
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
const sameOriginEnvironment = { mode: 'prod', prodApiUrl: 'same-origin' };

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('public and server API configuration', () => {
	it('uses the internal origin only for server API calls', () => {
		expect(resolveApiOrigin(productionEnvironment)).toBe('http://backend:3000/api');
	});

	it('resolves browser requests on the current preview host without a public DNS dependency', () => {
		vi.stubGlobal('window', { location: { origin: 'https://synthetic.cloudfront.net' } });
		expect(resolveApiOrigin({ ...sameOriginEnvironment, internalApiUrl: 'http://backend:3000' })).toBe(
			'https://synthetic.cloudfront.net/api'
		);
		expect(resolveApiOrigin(productionEnvironment)).toBe('https://api.24-7labs.com/api');
	});

	it('requires the internal server API in same-origin mode instead of falling back to GoDaddy', () => {
		vi.stubEnv('INTERNAL_API_URL', '');
		expect(() => resolveApiOrigin(sameOriginEnvironment)).toThrow('INTERNAL_API_URL');
		expect(resolveApiOrigin({ ...sameOriginEnvironment, internalApiUrl: 'http://backend:3000' })).toBe(
			'http://backend:3000/api'
		);
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

	it('keeps preview media root-relative on both server and browser', () => {
		for (const value of [
			'/uploads/products/example.jpg',
			'uploads/products/example.jpg',
			'https://24-7labs.com/uploads/products/example.jpg',
			'https://api.24-7labs.com/uploads/products/example.jpg',
			'//www.24-7labs.com/uploads/products/example.jpg',
		]) {
			expect(resolveImageUrl(value, sameOriginEnvironment)).toBe('/uploads/products/example.jpg');
		}
		expect(resolveImageUrl('https://24-7labs.com/wp-content/uploads/legacy.jpg?v=1', sameOriginEnvironment)).toBe(
			'/wp-content/uploads/legacy.jpg?v=1'
		);
		expect(resolveBlogImageUrl('uploads/blogcontent/example.jpg', sameOriginEnvironment)).toBe(
			'/uploads/blogcontent/example.jpg'
		);
		vi.stubGlobal('window', { location: { origin: 'https://synthetic.cloudfront.net' } });
		expect(resolveImageUrl('/uploads/products/example.jpg', sameOriginEnvironment)).toBe(
			'/uploads/products/example.jpg'
		);
	});

	it('does not rewrite unrelated, credentialed, or non-media absolute URLs', () => {
		for (const value of [
			'https://24-7labs.com.example.test/uploads/image.jpg',
			'https://24-7labs.com:444/uploads/image.jpg',
			'https://user@24-7labs.com/uploads/image.jpg',
			'https://24-7labs.com/something-else/image.jpg',
		]) {
			expect(resolveImageUrl(value, sameOriginEnvironment)).toBe(value);
		}
	});
});

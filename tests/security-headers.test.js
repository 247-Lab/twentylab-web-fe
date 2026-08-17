import { describe, expect, it } from 'vitest';
import { buildApiImagePattern, buildSecurityHeaders, validatePublicBuildConfig } from '../config/securityHeaders.mjs';

function headerMap(environment) {
	return new Map(buildSecurityHeaders(environment).map(({ key, value }) => [key, value]));
}

describe('security headers', () => {
	it('allows the configured production API without retaining SPCTEK as the only connect origin', () => {
		const headers = headerMap({
			NODE_ENV: 'production',
			NEXT_PUBLIC_MODE: 'prod',
			NEXT_PUBLIC_PROD_API_URL: 'https://api.24-7labs.com',
		});
		expect(headers.get('Content-Security-Policy')).toContain("connect-src 'self' https://api.24-7labs.com");
		expect(headers.get('Content-Security-Policy')).not.toContain('spctek.com');
		expect(headers.get('Strict-Transport-Security')).toBeTruthy();
	});

	it('does not force HTTPS or HSTS for local development', () => {
		const headers = headerMap({
			NODE_ENV: 'production',
			NEXT_PUBLIC_MODE: 'dev',
			NEXT_PUBLIC_DEV_API_URL: 'http://localhost:3000',
		});
		expect(headers.get('Content-Security-Policy')).toContain("connect-src 'self' http://localhost:3000");
		expect(headers.get('Content-Security-Policy')).not.toContain('upgrade-insecure-requests');
		expect(headers.has('Strict-Transport-Security')).toBe(false);
	});

	it('derives the Next image host from the configured API', () => {
		expect(
			buildApiImagePattern({
				NEXT_PUBLIC_MODE: 'prod',
				NEXT_PUBLIC_PROD_API_URL: 'https://api.24-7labs.com',
			})
		).toEqual({ protocol: 'https', hostname: 'api.24-7labs.com', port: '', pathname: '/uploads/**' });
	});

	it('requires explicit safe production image configuration', () => {
		expect(() =>
			validatePublicBuildConfig({
				NEXT_PUBLIC_MODE: 'prod',
				NEXT_PUBLIC_PROD_API_URL: 'http://api.example.com',
				NEXT_PUBLIC_SITE_URL: 'https://24-7labs.com',
			})
		).toThrow('HTTPS');

		expect(() =>
			validatePublicBuildConfig({
				NEXT_PUBLIC_MODE: 'prod',
				NEXT_PUBLIC_PROD_API_URL: 'https://api.24-7labs.com',
				NEXT_PUBLIC_SITE_URL: 'https://24-7labs.com',
			})
		).not.toThrow();

		expect(() =>
			validatePublicBuildConfig({
				NEXT_PUBLIC_MODE: 'dev',
				NEXT_PUBLIC_DEV_API_URL: 'http://127.0.0.1:3000',
				NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:4000',
			})
		).not.toThrow();
		expect(() => validatePublicBuildConfig({ NEXT_PUBLIC_MODE: 'preview' })).toThrow('dev or prod');

		for (const value of [
			'https://api.24-7labs.com/v1',
			'https://api.24-7labs.com?tenant=store',
			'https://api.24-7labs.com#fragment',
		]) {
			expect(() =>
				validatePublicBuildConfig({
					NEXT_PUBLIC_MODE: 'prod',
					NEXT_PUBLIC_PROD_API_URL: value,
					NEXT_PUBLIC_SITE_URL: 'https://24-7labs.com',
				})
			).toThrow('origin without a path, query, or fragment');
		}

		expect(() =>
			validatePublicBuildConfig({
				NEXT_PUBLIC_MODE: 'prod',
				NEXT_PUBLIC_PROD_API_URL: 'https://api.24-7labs.com',
				NEXT_PUBLIC_SITE_URL: 'https://24-7labs.com/store',
			})
		).toThrow('origin without a path, query, or fragment');
	});
});

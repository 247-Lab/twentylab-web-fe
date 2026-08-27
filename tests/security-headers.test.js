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

	it('adds only the selected hosted payment script and frame origins when checkout is enabled', () => {
		const sandbox = headerMap({
			NODE_ENV: 'production',
			NEXT_PUBLIC_MODE: 'prod',
			NEXT_PUBLIC_PROD_API_URL: 'https://api.24-7labs.com',
			NEXT_PUBLIC_CHECKOUT_ENABLED: 'true',
			NEXT_PUBLIC_AUTHORIZE_NET_ENVIRONMENT: 'sandbox',
			NEXT_PUBLIC_AUTHORIZE_NET_API_LOGIN_ID: 'synthetic-login',
			NEXT_PUBLIC_AUTHORIZE_NET_CLIENT_KEY: 'synthetic-client-key',
		});
		const sandboxPolicy = sandbox.get('Content-Security-Policy');
		expect(sandboxPolicy).toContain("script-src 'self' 'unsafe-inline' https://jstest.authorize.net");
		expect(sandboxPolicy).toContain(
			"frame-src 'self' https://maps.google.com https://www.google.com https://jstest.authorize.net"
		);
		expect(sandboxPolicy).not.toContain('https://js.authorize.net');

		const disabledPolicy = headerMap({
			NODE_ENV: 'production',
			NEXT_PUBLIC_MODE: 'prod',
			NEXT_PUBLIC_PROD_API_URL: 'https://api.24-7labs.com',
			NEXT_PUBLIC_CHECKOUT_ENABLED: 'false',
		}).get('Content-Security-Policy');
		expect(disabledPolicy).not.toContain('authorize.net');
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
		expect(() =>
			validatePublicBuildConfig({
				NEXT_PUBLIC_MODE: 'prod',
				NEXT_PUBLIC_PROD_API_URL: 'https://api.24-7labs.com',
				NEXT_PUBLIC_SITE_URL: 'https://24-7labs.com',
				NEXT_PUBLIC_CHECKOUT_ENABLED: 'yes',
			})
		).toThrow('true or false');
		expect(() =>
			validatePublicBuildConfig({
				NEXT_PUBLIC_MODE: 'prod',
				NEXT_PUBLIC_PROD_API_URL: 'https://api.24-7labs.com',
				NEXT_PUBLIC_SITE_URL: 'https://24-7labs.com',
				NEXT_PUBLIC_CHECKOUT_ENABLED: 'true',
				NEXT_PUBLIC_AUTHORIZE_NET_ENVIRONMENT: 'production',
			})
		).toThrow('API_LOGIN_ID');

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
